using Microsoft.EntityFrameworkCore;
using Skillora.Mvc.Models;

namespace Skillora.Mvc.Data;

public class SkilloraDbContext(DbContextOptions<SkilloraDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();
    public DbSet<ExchangeRequest> ExchangeRequests => Set<ExchangeRequest>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(user => user.Email).IsUnique();
        modelBuilder.Entity<Skill>().HasIndex(skill => skill.SkillName).IsUnique();
        modelBuilder.Entity<UserSkill>().HasIndex(userSkill => new { userSkill.UserId, userSkill.SkillId, userSkill.SkillType }).IsUnique();

        modelBuilder.Entity<ExchangeRequest>()
            .HasOne(request => request.Sender)
            .WithMany()
            .HasForeignKey(request => request.SenderId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ExchangeRequest>()
            .HasOne(request => request.Receiver)
            .WithMany()
            .HasForeignKey(request => request.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ExchangeRequest>()
            .HasOne(request => request.OfferedSkill)
            .WithMany()
            .HasForeignKey(request => request.OfferedSkillId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ExchangeRequest>()
            .HasOne(request => request.RequestedSkill)
            .WithMany()
            .HasForeignKey(request => request.RequestedSkillId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Review>().ToTable(table => table.HasCheckConstraint("CK_Reviews_Rating", "[Rating] >= 1 AND [Rating] <= 5"));
        modelBuilder.Entity<ExchangeRequest>().ToTable(table => table.HasCheckConstraint("CK_Requests_Status", "[Status] IN ('Pending','Accepted','Rejected','Cancelled','Completed')"));
    }
}
