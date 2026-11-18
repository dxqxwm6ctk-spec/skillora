namespace Skillora.Mvc.Models;

public class UserSkill
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int SkillId { get; set; }
    public string SkillType { get; set; } = "Teach";
    public User? User { get; set; }
    public Skill? Skill { get; set; }
}
