using System;

namespace DropLink.Api.Models
{
    public class Transfer
    {
        public int Id { get; set; }
        public int? FileId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public long TotalBytes { get; set; }
        public long TransferredBytes { get; set; }
        public string SenderDevice { get; set; } = "Local Host";
        public string ReceiverDevice { get; set; } = "Connected Peer";
        public string TransferType { get; set; } = "LAN"; // LAN, Global
        public string TransferStatus { get; set; } = "Completed"; // InProgress, Completed, Failed, Cancelled
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        public FileItem? File { get; set; }
    }
}
