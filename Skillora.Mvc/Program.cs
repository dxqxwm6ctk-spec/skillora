using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Skillora.Mvc.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "Skillora.Session";
        options.LoginPath = "/api/auth/me";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
    });
var connectionString = builder.Configuration.GetConnectionString("SkilloraDatabase")
    ?? "Data Source=skillora.db";
builder.Services.AddDbContext<SkilloraDbContext>(options =>
{
    if (connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase))
        options.UseSqlite(connectionString);
    else
        options.UseSqlServer(connectionString);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SkilloraDbContext>();
    try
    {
        db.Database.EnsureCreated();
        if (!await db.Skills.AnyAsync())
        {
            db.Skills.AddRange(
                new Skillora.Mvc.Models.Skill { SkillName = "React", Category = "برمجة" },
                new Skillora.Mvc.Models.Skill { SkillName = "UI/UX", Category = "تصميم" },
                new Skillora.Mvc.Models.Skill { SkillName = "Python", Category = "ذكاء اصطناعي" },
                new Skillora.Mvc.Models.Skill { SkillName = "English", Category = "لغات" });
            await db.SaveChangesAsync();
        }

        var adminEmails = AdminEmails.From(app.Configuration);
        if (adminEmails.Count > 0)
        {
            var toPromote = await db.Users
                .Where(user => adminEmails.Contains(user.Email) && user.Role != "Admin")
                .ToListAsync();
            toPromote.ForEach(user => user.Role = "Admin");
            if (toPromote.Count > 0)
            {
                await db.SaveChangesAsync();
                app.Logger.LogInformation("Promoted {Count} configured admin account(s).", toPromote.Count);
            }
        }
    }
    catch (Exception exception)
    {
        app.Logger.LogWarning(exception, "SQL Server غير متاح حالياً. تم تشغيل الموقع دون إنشاء قاعدة البيانات.");
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
