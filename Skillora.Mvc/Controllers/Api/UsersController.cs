using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

[ApiController]
[Route("api/users")]
public class UsersController(SkilloraDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await db.Users.AsNoTracking().Where(user => user.IsActive).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await db.Users.AnyAsync(user => user.Email == request.Email))
            return Conflict(new { message = "البريد الإلكتروني مسجل مسبقاً" });

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            Role = request.Role ?? "Student",
            University = request.University
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Created($"/api/users/{user.Id}", user);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusRequest request)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        return Ok(user);
    }
}

public record RegisterRequest(string Name, string Email, string Password, string? Role, string? University);
public record StatusRequest(bool IsActive);
