namespace Skillora.Mvc.Models;

public class ExchangeRequest
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public int ReceiverId { get; set; }
    public int OfferedSkillId { get; set; }
    public int RequestedSkillId { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public User? Sender { get; set; }
    public User? Receiver { get; set; }
    public Skill? OfferedSkill { get; set; }
    public Skill? RequestedSkill { get; set; }
}
