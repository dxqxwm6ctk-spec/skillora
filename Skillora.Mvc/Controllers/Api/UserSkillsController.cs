using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

[ApiController]
[Route("api/user-skills")]
[Authorize]
public class UserSkillsController(SkilloraDbContext db) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMySkills()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var skills = await db.UserSkills.AsNoTracking()
            .Include(userSkill => userSkill.Skill)
            .Where(userSkill => userSkill.UserId == userId)
            .Select(userSkill => new
            {
                userSkill.Id,
                userSkill.SkillType,
                SkillName = userSkill.Skill!.SkillName,
                Category = userSkill.Skill.Category
            })
            .ToListAsync();
        return Ok(skills);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddUserSkillRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (request.SkillType != "Teach" && request.SkillType != "Learn")
            return BadRequest(new { message = "SkillType يجب أن يكون Teach أو Learn" });

        var skill = await db.Skills.FirstOrDefaultAsync(candidate =>
            candidate.SkillName.ToLower() == request.SkillName.Trim().ToLower());
        if (skill is null)
        {
            skill = new Skill { SkillName = request.SkillName.Trim(), Category = request.Category ?? "عام" };
            db.Skills.Add(skill);
            await db.SaveChangesAsync();
        }
        if (await db.UserSkills.AnyAsync(item => item.UserId == userId && item.SkillId == skill.Id && item.SkillType == request.SkillType))
            return Conflict(new { message = "المهارة موجودة بالفعل" });

        db.UserSkills.Add(new UserSkill
        {
            UserId = userId,
            SkillId = skill.Id,
            SkillType = request.SkillType
        });
        await db.SaveChangesAsync();
        return Ok(new { skill.Id, skill.SkillName, skill.Category, request.SkillType });
    }
}

public record AddUserSkillRequest(string SkillName, string SkillType, string? Category);
