using System;

namespace DropLink.Api.Models
{
    public class Device
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string DeviceIdentifier { get; set; } = string.Empty; // Unique browser/machine ID
        public string DeviceName { get; set; } = string.Empty; // e.g. "Samsung Galaxy S24", "MacBook Pro"
        public string DeviceType { get; set; } = "Mobile"; // Mobile, Desktop, Tablet
        public string IpAddress { get; set; } = string.Empty;
        public string? PairingPin { get; set; }
        public bool IsPaired { get; set; } = false;
        public bool IsOnline { get; set; } = true;
        public DateTime LastConnectedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
