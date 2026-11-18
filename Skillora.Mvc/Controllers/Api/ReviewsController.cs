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

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        if (request.Rating is < 1 or > 5)
            return BadRequest(new { message = "التقييم يجب أن يكون من 1 إلى 5" });
        var reviewerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        db.Reviews.Add(new Review
        {
            RequestId = request.RequestId,
            ReviewerId = reviewerId,
            ReviewedUserId = request.ReviewedUserId,
            Rating = request.Rating,
            Comment = request.Comment
        });
        await db.SaveChangesAsync();
        return Ok(new { message = "تم حفظ التقييم" });
    }
}

public record CreateReviewRequest(int RequestId, int ReviewedUserId, int Rating, string? Comment);
