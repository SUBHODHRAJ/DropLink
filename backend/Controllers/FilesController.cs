using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using DropLink.Api.Data;
using DropLink.Api.Models;
using DropLink.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DropLink.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FilesController : ControllerBase
    {
        private readonly DropLinkDbContext _db;
        private readonly IStorageService _storageService;

        public FilesController(DropLinkDbContext db, IStorageService storageService)
        {
            _db = db;
            _storageService = storageService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id)) return id;
            return null;
        }

        [HttpGet]
        public async Task<IActionResult> GetFiles(
            [FromQuery] string? category,
            [FromQuery] int? folderId,
            [FromQuery] bool? isFavorite,
            [FromQuery] bool? isDeleted,
            [FromQuery] string? search,
            [FromQuery] string? sortBy,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var userId = GetCurrentUserId();
            var query = _db.Files
                .Include(f => f.Folder)
                .Where(f => userId == null || f.UserId == userId);

            // Deleted filter
            var showDeleted = isDeleted ?? false;
            query = query.Where(f => f.IsDeleted == showDeleted);

            // Category filter
            if (!string.IsNullOrEmpty(category) && category != "All")
            {
                query = query.Where(f => f.FileCategory == category);
            }

            // Folder filter
            if (folderId.HasValue)
            {
                query = query.Where(f => f.FolderId == folderId.Value);
            }

            // Favorite filter
            if (isFavorite.HasValue)
            {
                query = query.Where(f => f.IsFavorite == isFavorite.Value);
            }

            // Search query
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(f => EF.Functions.Like(f.OriginalFileName.ToLower(), $"%{term}%"));
            }

            // Sorting
            query = sortBy switch
            {
                "size_desc" => query.OrderByDescending(f => f.FileSize),
                "size_asc" => query.OrderBy(f => f.FileSize),
                "name_asc" => query.OrderBy(f => f.OriginalFileName),
                "name_desc" => query.OrderByDescending(f => f.OriginalFileName),
                "oldest" => query.OrderBy(f => f.UploadedAt),
                _ => query.OrderByDescending(f => f.UploadedAt)
            };

            var totalCount = await query.CountAsync();
            var totalBytes = await query.SumAsync(f => (long?)f.FileSize) ?? 0;

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(f => new
                {
                    f.Id,
                    f.FileName,
                    f.OriginalFileName,
                    f.FileSize,
                    f.FileExtension,
                    f.MimeType,
                    f.StorageProvider,
                    f.Checksum,
                    f.FileCategory,
                    f.FolderId,
                    FolderName = f.Folder != null ? f.Folder.FolderName : null,
                    f.IsFavorite,
                    f.IsDeleted,
                    f.UploadedAt,
                    DownloadUrl = $"/api/share/download/{f.Id}",
                    StreamUrl = $"/api/share/stream/{f.Id}"
                })
                .ToListAsync();

            return Ok(new
            {
                totalCount,
                totalBytes,
                page,
                pageSize,
                items
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFileDetails(int id)
        {
            var file = await _db.Files.Include(f => f.Folder).FirstOrDefaultAsync(f => f.Id == id);
            if (file == null) return NotFound(new { message = "File not found." });

            return Ok(new
            {
                file.Id,
                file.FileName,
                file.OriginalFileName,
                file.FileSize,
                file.FileExtension,
                file.MimeType,
                file.StorageProvider,
                file.Checksum,
                file.FileCategory,
                file.FolderId,
                FolderName = file.Folder?.FolderName,
                file.IsFavorite,
                file.IsDeleted,
                file.UploadedAt,
                DownloadUrl = $"/api/share/download/{file.Id}",
                StreamUrl = $"/api/share/stream/{file.Id}"
            });
        }

        [HttpPatch("{id}/favorite")]
        public async Task<IActionResult> ToggleFavorite(int id)
        {
            var file = await _db.Files.FindAsync(id);
            if (file == null) return NotFound(new { message = "File not found." });

            file.IsFavorite = !file.IsFavorite;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, isFavorite = file.IsFavorite });
        }

        [HttpPatch("{id}/rename")]
        public async Task<IActionResult> RenameFile(int id, [FromBody] RenameFileRequest request)
        {
            var file = await _db.Files.FindAsync(id);
            if (file == null) return NotFound(new { message = "File not found." });

            if (string.IsNullOrWhiteSpace(request.NewFileName))
            {
                return BadRequest(new { message = "File name cannot be empty." });
            }

            file.OriginalFileName = request.NewFileName.Trim();
            await _db.SaveChangesAsync();

            return Ok(new { success = true, newName = file.OriginalFileName });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFile(int id, [FromQuery] bool permanent = false)
        {
            var file = await _db.Files.FindAsync(id);
            if (file == null) return NotFound(new { message = "File not found." });

            if (permanent || file.IsDeleted)
            {
                // Permanent deletion
                await _storageService.DeleteFileAsync(file.StoragePath);
                _db.Files.Remove(file);
                await _db.SaveChangesAsync();
                return Ok(new { success = true, message = "File permanently deleted." });
            }
            else
            {
                // Soft delete (move to trash)
                file.IsDeleted = true;
                file.DeletedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return Ok(new { success = true, message = "File moved to trash." });
            }
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreFile(int id)
        {
            var file = await _db.Files.FindAsync(id);
            if (file == null) return NotFound(new { message = "File not found." });

            file.IsDeleted = false;
            file.DeletedAt = null;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "File restored from trash." });
        }
    }

    public class RenameFileRequest
    {
        public string NewFileName { get; set; } = string.Empty;
    }
}
