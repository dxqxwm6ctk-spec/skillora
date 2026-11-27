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
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsAdmin => User.IsInRole("Admin");

    // Students only see requests they sent or received. Admins may see all, or filter by userId.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? userId)
    {
        var query = db.ExchangeRequests.AsNoTracking();
        if (IsAdmin)
        {
            if (userId.HasValue)
                query = query.Where(request => request.SenderId == userId || request.ReceiverId == userId);
        }
        else
        {
            var me = CurrentUserId;
            query = query.Where(request => request.SenderId == me || request.ReceiverId == me);
        }

        var caller = CurrentUserId;
        var results = await query
            .OrderByDescending(request => request.CreatedAt)
            .Select(request => new ExchangeRequestDto(
                request.Id,
                request.Status,
                request.CreatedAt,
                request.UpdatedAt,
                new PersonDto(request.SenderId, request.Sender!.Name),
                new PersonDto(request.ReceiverId, request.Receiver!.Name),
                new SkillDto(request.OfferedSkillId, request.OfferedSkill!.SkillName),
                new SkillDto(request.RequestedSkillId, request.RequestedSkill!.SkillName),
                db.Reviews.Any(review => review.RequestId == request.Id && review.ReviewerId == caller)))
            .ToListAsync();
        return Ok(results);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExchangeRequest request)
    {
        var senderId = CurrentUserId;
        var receiver = await db.Users.FirstOrDefaultAsync(user =>
            user.IsActive && user.Name.ToLower() == request.ReceiverName.Trim().ToLower());
        if (receiver is null)
            return BadRequest(new { message = "المستخدم المستلم غير موجود" });
        if (receiver.Id == senderId)
            return BadRequest(new { message = "ما تقدر ترسل طلب تبادل لنفسك" });

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
        return Created($"/api/requests/{exchange.Id}", ToSummary(exchange));
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

    // Who may change a request, and from which state:
    //   accept / reject -> only the receiver, while Pending
    //   cancel          -> only the sender, while Pending or Accepted
    //   complete        -> sender or receiver, while Accepted
    [HttpPatch("{id:int}/{status}")]
    public async Task<IActionResult> UpdateStatus(int id, string status)
    {
        var request = await db.ExchangeRequests.FindAsync(id);
        if (request is null) return NotFound();

        var me = CurrentUserId;
        var isSender = request.SenderId == me;
        var isReceiver = request.ReceiverId == me;
        // Hide the request's existence from users who are not part of it.
        if (!isSender && !isReceiver) return NotFound();

        string? next;
        bool allowed;
        switch (status.ToLowerInvariant())
        {
            case "accept":
                next = "Accepted"; allowed = isReceiver && request.Status == "Pending"; break;
            case "reject":
                next = "Rejected"; allowed = isReceiver && request.Status == "Pending"; break;
            case "cancel":
                next = "Cancelled"; allowed = isSender && request.Status is "Pending" or "Accepted"; break;
            case "complete":
                next = "Completed"; allowed = request.Status == "Accepted"; break;
            default:
                return BadRequest(new { message = "حالة طلب غير صالحة" });
        }
        if (!allowed)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "ما تقدر تغيّر حالة هذا الطلب" });

        request.Status = next;
        request.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToSummary(request));
    }

    private static object ToSummary(ExchangeRequest request) => new
    {
        request.Id,
        request.SenderId,
        request.ReceiverId,
        request.OfferedSkillId,
        request.RequestedSkillId,
        request.Status,
        request.CreatedAt,
        request.UpdatedAt
    };

    public record CreateExchangeRequest(string ReceiverName, string OfferedSkillName, string RequestedSkillName);
    public record PersonDto(int Id, string Name);
    public record SkillDto(int Id, string SkillName);
    public record ExchangeRequestDto(int Id, string Status, DateTime CreatedAt, DateTime UpdatedAt,
        PersonDto Sender, PersonDto Receiver, SkillDto OfferedSkill, SkillDto RequestedSkill, bool ReviewedByMe);
}
