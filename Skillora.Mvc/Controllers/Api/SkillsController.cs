using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

[ApiController]
[Route("api/skills")]
public class SkillsController(SkilloraDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category, [FromQuery] string? search)
    {
        var query = db.Skills.AsNoTracking().Where(skill => skill.IsActive);
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(skill => skill.Category == category);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(skill => skill.SkillName.Contains(search));
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SkillName))
            return BadRequest(new { message = "اسم المهارة مطلوب" });
        var skill = new Skill
        {
            SkillName = request.SkillName.Trim(),
            Category = request.Category?.Trim() ?? string.Empty,
            IsActive = request.IsActive ?? true
        };
        db.Skills.Add(skill);
        await db.SaveChangesAsync();
        return Created($"/api/skills/{skill.Id}", skill);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusRequest request)
    {
        var skill = await db.Skills.FindAsync(id);
        if (skill is null) return NotFound();
        skill.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        return Ok(skill);
    }
}

public record CreateSkillRequest(string SkillName, string? Category, bool? IsActive);
