using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class AuthController(SkilloraDbContext db) : ControllerBase
{
    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
            return BadRequest(new { message = "رمز Google مطلوب" });

        var projectId = Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID")
            ?? "skillora-learnhub";
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(
                request.IdToken,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { projectId }
                });

            if (!string.Equals(payload.Issuer, $"https://securetoken.google.com/{projectId}", StringComparison.Ordinal))
                return Unauthorized(new { message = "رمز الدخول صادر من مشروع Firebase مختلف" });
            if (!payload.EmailVerified)
                return Unauthorized(new { message = "لم يتم التحقق من بريد حساب Google" });

            var normalizedEmail = payload.Email.Trim().ToLowerInvariant();
            var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == normalizedEmail);
            if (user is null)
            {
                user = new User
                {
                    Name = string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
                    Email = normalizedEmail,
                    Role = "Student",
                    ProfileImage = payload.Picture
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }
            if (!user.IsActive)
                return Unauthorized(new { message = "تم تعطيل حساب المستخدم" });

            db.ActivityLogs.Add(new ActivityLog
            {
                UserId = user.Id,
                Action = "GoogleLogin",
                Details = $"{user.Name} سجل الدخول باستخدام Google"
            });
            await db.SaveChangesAsync();
            await SignInAsync(user);
            return Ok(new { user.Id, user.Name, user.Email, user.Role });
        }
        catch (InvalidJwtException)
        {
            return Unauthorized(new { message = "رمز Google غير صالح أو منتهي الصلاحية" });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            request.Password.Length < 6)
            return BadRequest(new { message = "الاسم والبريد وكلمة مرور من 6 أحرف على الأقل مطلوبة" });

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(user => user.Email == normalizedEmail))
            return Conflict(new { message = "البريد الإلكتروني مسجل مسبقاً" });

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            Role = "Student"
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.ActivityLogs.Add(new ActivityLog
        {
            UserId = user.Id,
            Action = "UserRegistered",
            Details = $"{user.Name} سجل حساباً جديداً"
        });
        await db.SaveChangesAsync();
        await SignInAsync(user);
        return Ok(new { user.Id, user.Name, user.Email, user.Role });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == normalizedEmail);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "بيانات الدخول غير صحيحة" });

        var result = new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "بيانات الدخول غير صحيحة" });

        await SignInAsync(user);
        return Ok(new { user.Id, user.Name, user.Email, user.Role });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(idClaim, out var userId)) return Unauthorized();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(candidate => candidate.Id == userId && candidate.IsActive);
        if (user is null) return Unauthorized();
        return Ok(new { user.Id, user.Name, user.Email, user.Role, user.University, user.Bio });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "تم تسجيل الخروج" });
    }

    private async Task SignInAsync(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true, ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7) });
    }
}

public record AuthRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record GoogleLoginRequest(string IdToken);
