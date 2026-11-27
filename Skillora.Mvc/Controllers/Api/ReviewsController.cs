using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Data;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Controllers.Api;

[ApiController]
[Route("api/reviews")]
[Authorize]
public class ReviewsController(SkilloraDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? userId) =>
        Ok(await db.Reviews.AsNoTracking()
            .Where(review => !userId.HasValue || review.ReviewedUserId == userId)
            .OrderByDescending(review => review.CreatedAt)
            .ToListAsync());

    // A review belongs to a completed exchange: only its two participants may
    // review, each one reviews the other person, and only once.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        if (request.Rating is < 1 or > 5)
            return BadRequest(new { message = "التقييم يجب أن يكون من 1 إلى 5" });

        var reviewerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var exchange = await db.ExchangeRequests.AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == request.RequestId);
        if (exchange is null || (exchange.SenderId != reviewerId && exchange.ReceiverId != reviewerId))
            return NotFound(new { message = "التبادل غير موجود" });
        if (exchange.Status != "Completed")
            return BadRequest(new { message = "تقدر تقيّم بعد ما يكتمل التبادل" });
        if (await db.Reviews.AnyAsync(review => review.RequestId == exchange.Id && review.ReviewerId == reviewerId))
            return Conflict(new { message = "قيّمت هذا التبادل من قبل" });

        db.Reviews.Add(new Review
        {
            RequestId = exchange.Id,
            ReviewerId = reviewerId,
            ReviewedUserId = exchange.SenderId == reviewerId ? exchange.ReceiverId : exchange.SenderId,
            Rating = request.Rating,
            Comment = request.Comment?.Trim()
        });
        await db.SaveChangesAsync();
        return Ok(new { message = "تم حفظ التقييم" });
    }
}

public record CreateReviewRequest(int RequestId, int Rating, string? Comment);
