namespace Skillora.Mvc.Data;

/// <summary>
/// Admins are named in configuration, never chosen through the public API.
/// Set "Admin:Emails" (comma separated) in appsettings, user secrets, or the
/// environment variable Admin__Emails. Matching accounts are promoted when the
/// app starts and when they sign in with a verified Google account.
/// </summary>
public static class AdminEmails
{
    public static HashSet<string> From(IConfiguration configuration) =>
        (configuration["Admin:Emails"] ?? string.Empty)
            .Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(email => email.ToLowerInvariant())
            .ToHashSet();
}
