using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DropLink.Api.Services
{
    public class LocalStorageService : IStorageService
    {
        private readonly string _storageRoot;
        private readonly string _tempRoot;
        private readonly ILogger<LocalStorageService> _logger;

        public LocalStorageService(IConfiguration configuration, ILogger<LocalStorageService> logger)
        {
            _logger = logger;
            _storageRoot = Path.GetFullPath(configuration["StorageSettings:LocalStoragePath"] ?? "storage/local");
            _tempRoot = Path.GetFullPath(configuration["StorageSettings:TempStoragePath"] ?? "storage/temporary");

            Directory.CreateDirectory(_storageRoot);
            Directory.CreateDirectory(_tempRoot);
        }

        public string GetStorageRoot() => _storageRoot;
        public string GetTempRoot() => _tempRoot;

        public bool CheckAvailableDiskSpace(long requiredBytes)
        {
            try
            {
                var driveInfo = new DriveInfo(Path.GetPathRoot(_storageRoot) ?? "C:\\");
                // Allow safe margin of at least 500 MB extra
                return driveInfo.AvailableFreeSpace > (requiredBytes + (500L * 1024 * 1024));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to inspect drive free space. Proceeding cautiously.");
                return true;
            }
        }

        public async Task<string> SaveChunkAsync(string sessionId, int chunkIndex, Stream chunkStream)
        {
            var sessionFolder = Path.Combine(_tempRoot, sessionId);
            Directory.CreateDirectory(sessionFolder);

            var chunkPath = Path.Combine(sessionFolder, $"chunk_{chunkIndex:D6}.part");
            using (var fileStream = new FileStream(chunkPath, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024, useAsync: true))
            {
                await chunkStream.CopyToAsync(fileStream);
            }

            return chunkPath;
        }

        public async Task<string> AssembleChunksAsync(string sessionId, string targetFileName, int totalChunks, string? expectedChecksum = null)
        {
            var sessionFolder = Path.Combine(_tempRoot, sessionId);
            if (!Directory.Exists(sessionFolder))
            {
                throw new DirectoryNotFoundException($"Upload session directory not found for session {sessionId}");
            }

            // Safe unique file name in storage root
            var safeFileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}_{Path.GetFileName(targetFileName)}";
            var finalDestination = Path.Combine(_storageRoot, safeFileName);

            using (var destinationStream = new FileStream(finalDestination, FileMode.Create, FileAccess.Write, FileShare.None, 1024 * 1024, useAsync: true))
            {
                for (int i = 0; i < totalChunks; i++)
                {
                    var chunkPath = Path.Combine(sessionFolder, $"chunk_{i:D6}.part");
                    if (!File.Exists(chunkPath))
                    {
                        throw new FileNotFoundException($"Missing chunk {i} for session {sessionId}");
                    }

                    using (var chunkStream = new FileStream(chunkPath, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 1024, useAsync: true))
                    {
                        await chunkStream.CopyToAsync(destinationStream);
                    }
                }
            }

            // Verify checksum if provided
            if (!string.IsNullOrEmpty(expectedChecksum))
            {
                var calculated = await CalculateChecksumAsync(finalDestination);
                if (!string.Equals(calculated, expectedChecksum, StringComparison.OrdinalIgnoreCase))
                {
                    File.Delete(finalDestination);
                    throw new InvalidOperationException($"Checksum mismatch! Expected {expectedChecksum}, got {calculated}");
                }
            }

            // Clean up temporary session directory asynchronously
            try
            {
                Directory.Delete(sessionFolder, recursive: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete temporary session folder {SessionFolder}", sessionFolder);
            }

            // Return path relative to storage root for database storage
            return Path.GetRelativePath(_storageRoot, finalDestination);
        }

        public async Task<string> SaveDirectFileAsync(string fileName, Stream fileStream)
        {
            var safeFileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}_{Path.GetFileName(fileName)}";
            var finalDestination = Path.Combine(_storageRoot, safeFileName);

            using (var destinationStream = new FileStream(finalDestination, FileMode.Create, FileAccess.Write, FileShare.None, 1024 * 1024, useAsync: true))
            {
                await fileStream.CopyToAsync(destinationStream);
            }

            return Path.GetRelativePath(_storageRoot, finalDestination);
        }

        public FileStream? GetFileStream(string relativePath)
        {
            var fullPath = Path.GetFullPath(Path.Combine(_storageRoot, relativePath));
            // Security: Prevent directory traversal attack
            if (!fullPath.StartsWith(_storageRoot, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Access outside of storage boundary is forbidden.");
            }

            if (!File.Exists(fullPath))
            {
                return null;
            }

            return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true);
        }

        public Task<bool> DeleteFileAsync(string relativePath)
        {
            var fullPath = Path.GetFullPath(Path.Combine(_storageRoot, relativePath));
            if (!fullPath.StartsWith(_storageRoot, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Access outside of storage boundary is forbidden.");
            }

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        public async Task<string> CalculateChecksumAsync(string filePath)
        {
            using var sha256 = SHA256.Create();
            using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 1024, useAsync: true);
            var hashBytes = await sha256.ComputeHashAsync(stream);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }
    }
}
