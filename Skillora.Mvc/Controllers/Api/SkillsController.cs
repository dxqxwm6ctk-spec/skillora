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
    public async Task<IActionResult> Create([FromBody] Skill skill)
    {
        db.Skills.Add(skill);
        await db.SaveChangesAsync();
        return Created($"/api/skills/{skill.Id}", skill);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusRequest request)
    {
        var skill = await db.Skills.FindAsync(id);
        if (skill is null) return NotFound();
        skill.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        return Ok(skill);
    }
}
