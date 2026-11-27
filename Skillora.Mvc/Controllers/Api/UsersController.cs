using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

// User management is for admins only. Students sign up through /api/auth/register.
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController(SkilloraDbContext db) : ControllerBase
{
    private static readonly string[] AllowedRoles = ["Student", "Admin"];

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await db.Users.AsNoTracking()
            .OrderBy(user => user.Name)
            .Select(user => new UserDto(user.Id, user.Name, user.Email, user.Role, user.University, user.IsActive, user.CreatedAt))
            .ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(user => user.Email == email))
            return Conflict(new { message = "البريد الإلكتروني مسجل مسبقاً" });

        var role = request.Role ?? "Student";
        if (!AllowedRoles.Contains(role))
            return BadRequest(new { message = "دور غير صالح" });

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            Role = role,
            University = request.University
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Created($"/api/users/{user.Id}", ToDto(user));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusRequest request)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    private static UserDto ToDto(User user) =>
        new(user.Id, user.Name, user.Email, user.Role, user.University, user.IsActive, user.CreatedAt);
}

public record UserDto(int Id, string Name, string Email, string Role, string? University, bool IsActive, DateTime CreatedAt);
public record RegisterRequest(string Name, string Email, string Password, string? Role, string? University);
public record StatusRequest(bool IsActive);
