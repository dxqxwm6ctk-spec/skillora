using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

[ApiController]
[Route("api/requests")]
[Authorize]
public class RequestsController(SkilloraDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? userId) =>
        Ok(await db.ExchangeRequests.AsNoTracking()
            .Include(request => request.Sender)
            .Include(request => request.Receiver)
            .Include(request => request.OfferedSkill)
            .Include(request => request.RequestedSkill)
            .Where(request => !userId.HasValue || request.SenderId == userId || request.ReceiverId == userId)
            .ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExchangeRequest request)
    {
        var senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var receiver = await db.Users.FirstOrDefaultAsync(user =>
            user.Name.ToLower() == request.ReceiverName.Trim().ToLower());
        if (receiver is null)
            return BadRequest(new { message = "المستخدم المستلم غير موجود" });

        var offered = await GetOrCreateSkill(request.OfferedSkillName, "عام");
        var requested = await GetOrCreateSkill(request.RequestedSkillName, "عام");
        var exchange = new ExchangeRequest
        {
            SenderId = senderId,
            ReceiverId = receiver.Id,
            OfferedSkillId = offered.Id,
            RequestedSkillId = requested.Id,
            Status = "Pending"
        };
        db.ExchangeRequests.Add(exchange);
        await db.SaveChangesAsync();
        return Created($"/api/requests/{exchange.Id}", exchange);
    }

    private async Task<Skill> GetOrCreateSkill(string skillName, string category)
    {
        var normalized = skillName.Trim();
        var skill = await db.Skills.FirstOrDefaultAsync(candidate =>
            candidate.SkillName.ToLower() == normalized.ToLower());
        if (skill is not null) return skill;
        skill = new Skill { SkillName = normalized, Category = category };
        db.Skills.Add(skill);
        await db.SaveChangesAsync();
        return skill;
    }

    [HttpPatch("{id:int}/{status}")]
    public async Task<IActionResult> UpdateStatus(int id, string status)
    {
        var request = await db.ExchangeRequests.FindAsync(id);
        if (request is null) return NotFound();
        var normalized = status.ToLowerInvariant();
        var allowed = normalized switch
        {
            "accept" => "Accepted",
            "reject" => "Rejected",
            "cancel" => "Cancelled",
            "complete" => "Completed",
            _ => null
        };
        if (allowed is null) return BadRequest(new { message = "حالة طلب غير صالحة" });
        request.Status = allowed;
        request.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(request);
    }

    public record CreateExchangeRequest(string ReceiverName, string OfferedSkillName, string RequestedSkillName);
}
