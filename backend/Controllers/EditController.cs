using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using DropLink.Api.Data;
using DropLink.Api.DTOs;
using DropLink.Api.Models;
using DropLink.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DropLink.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EditController : ControllerBase
    {
        private readonly DropLinkDbContext _db;
        private readonly IPdfService _pdfService;
        private readonly IStorageService _storageService;

        public EditController(DropLinkDbContext db, IPdfService pdfService, IStorageService storageService)
        {
            _db = db;
            _pdfService = pdfService;
            _storageService = storageService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id)) return id;
            return null;
        }

        // ==================== NOTES ====================

        [HttpGet("notes")]
        public async Task<IActionResult> GetNotes()
        {
            var userId = GetCurrentUserId();
            var notes = await _db.Notes
                .Where(n => (userId == null || n.UserId == userId) && !n.IsDeleted)
                .OrderByDescending(n => n.IsPinned)
                .ThenByDescending(n => n.UpdatedAt)
                .Select(n => new NoteDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Content = n.Content,
                    PlainText = n.PlainText,
                    Color = n.Color,
                    IsPinned = n.IsPinned,
                    IsFavorite = n.IsFavorite,
                    CreatedAt = n.CreatedAt,
                    UpdatedAt = n.UpdatedAt
                })
                .ToListAsync();

            return Ok(notes);
        }

        [HttpGet("notes/{id}")]
        public async Task<IActionResult> GetNoteById(int id)
        {
            var note = await _db.Notes.FindAsync(id);
            if (note == null || note.IsDeleted) return NotFound(new { message = "Note not found." });

            return Ok(new NoteDto
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                PlainText = note.PlainText,
                Color = note.Color,
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt
            });
        }

        [HttpPost("notes")]
        public async Task<IActionResult> CreateNote([FromBody] SaveNoteRequest request)
        {
            var userId = GetCurrentUserId();
            var note = new Note
            {
                UserId = userId,
                Title = string.IsNullOrWhiteSpace(request.Title) ? "Untitled Note" : request.Title.Trim(),
                Content = request.Content,
                PlainText = request.PlainText,
                Color = request.Color ?? "#38a9f6",
                IsPinned = request.IsPinned,
                IsFavorite = request.IsFavorite,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Notes.Add(note);
            await _db.SaveChangesAsync();

            return Ok(new NoteDto
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                PlainText = note.PlainText,
                Color = note.Color,
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt
            });
        }

        [HttpPut("notes/{id}")]
        public async Task<IActionResult> UpdateNote(int id, [FromBody] SaveNoteRequest request)
        {
            var note = await _db.Notes.FindAsync(id);
            if (note == null || note.IsDeleted) return NotFound(new { message = "Note not found." });

            note.Title = string.IsNullOrWhiteSpace(request.Title) ? "Untitled Note" : request.Title.Trim();
            note.Content = request.Content;
            note.PlainText = request.PlainText;
            note.Color = request.Color ?? note.Color;
            note.IsPinned = request.IsPinned;
            note.IsFavorite = request.IsFavorite;
            note.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new NoteDto
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                PlainText = note.PlainText,
                Color = note.Color,
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt
            });
        }

        [HttpDelete("notes/{id}")]
        public async Task<IActionResult> DeleteNote(int id)
        {
            var note = await _db.Notes.FindAsync(id);
            if (note == null) return NotFound(new { message = "Note not found." });

            note.IsDeleted = true;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Note moved to trash." });
        }

        // ==================== DOCUMENTS ====================

        [HttpGet("documents")]
        public async Task<IActionResult> GetDocuments([FromQuery] int? folderId)
        {
            var userId = GetCurrentUserId();
            var query = _db.Documents
                .Include(d => d.Folder)
                .Where(d => (userId == null || d.UserId == userId) && !d.IsDeleted);

            if (folderId.HasValue)
            {
                query = query.Where(d => d.FolderId == folderId.Value);
            }

            var docs = await query
                .OrderByDescending(d => d.UpdatedAt)
                .Select(d => new DocumentDto
                {
                    Id = d.Id,
                    Title = d.Title,
                    Content = d.Content,
                    PlainText = d.PlainText,
                    FolderId = d.FolderId,
                    FolderName = d.Folder != null ? d.Folder.FolderName : null,
                    IsFavorite = d.IsFavorite,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt
                })
                .ToListAsync();

            return Ok(docs);
        }

        [HttpGet("documents/{id}")]
        public async Task<IActionResult> GetDocumentById(int id)
        {
            var doc = await _db.Documents.Include(d => d.Folder).FirstOrDefaultAsync(d => d.Id == id);
            if (doc == null || doc.IsDeleted) return NotFound(new { message = "Document not found." });

            return Ok(new DocumentDto
            {
                Id = doc.Id,
                Title = doc.Title,
                Content = doc.Content,
                PlainText = doc.PlainText,
                FolderId = doc.FolderId,
                FolderName = doc.Folder?.FolderName,
                IsFavorite = doc.IsFavorite,
                CreatedAt = doc.CreatedAt,
                UpdatedAt = doc.UpdatedAt
            });
        }

        [HttpPost("documents")]
        public async Task<IActionResult> CreateDocument([FromBody] SaveDocumentRequest request)
        {
            var userId = GetCurrentUserId();
            var doc = new Document
            {
                UserId = userId,
                Title = string.IsNullOrWhiteSpace(request.Title) ? "Untitled Document" : request.Title.Trim(),
                Content = request.Content,
                PlainText = request.PlainText,
                FolderId = request.FolderId,
                IsFavorite = request.IsFavorite,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Documents.Add(doc);
            await _db.SaveChangesAsync();

            return Ok(new DocumentDto
            {
                Id = doc.Id,
                Title = doc.Title,
                Content = doc.Content,
                PlainText = doc.PlainText,
                FolderId = doc.FolderId,
                IsFavorite = doc.IsFavorite,
                CreatedAt = doc.CreatedAt,
                UpdatedAt = doc.UpdatedAt
            });
        }

        [HttpPut("documents/{id}")]
        public async Task<IActionResult> UpdateDocument(int id, [FromBody] SaveDocumentRequest request)
        {
            var doc = await _db.Documents.FindAsync(id);
            if (doc == null || doc.IsDeleted) return NotFound(new { message = "Document not found." });

            doc.Title = string.IsNullOrWhiteSpace(request.Title) ? "Untitled Document" : request.Title.Trim();
            doc.Content = request.Content;
            doc.PlainText = request.PlainText;
            doc.FolderId = request.FolderId;
            doc.IsFavorite = request.IsFavorite;
            doc.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new DocumentDto
            {
                Id = doc.Id,
                Title = doc.Title,
                Content = doc.Content,
                PlainText = doc.PlainText,
                FolderId = doc.FolderId,
                IsFavorite = doc.IsFavorite,
                CreatedAt = doc.CreatedAt,
                UpdatedAt = doc.UpdatedAt
            });
        }

        [HttpDelete("documents/{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var doc = await _db.Documents.FindAsync(id);
            if (doc == null) return NotFound(new { message = "Document not found." });

            doc.IsDeleted = true;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Document moved to trash." });
        }

        // ==================== FOLDERS ====================

        [HttpGet("folders")]
        public async Task<IActionResult> GetFolders([FromQuery] int? parentId)
        {
            var userId = GetCurrentUserId();
            var folders = await _db.Folders
                .Where(f => (userId == null || f.UserId == userId) && f.ParentFolderId == parentId)
                .Select(f => new FolderDto
                {
                    Id = f.Id,
                    FolderName = f.FolderName,
                    ParentFolderId = f.ParentFolderId,
                    Color = f.Color,
                    SubFolderCount = f.SubFolders.Count,
                    FileCount = f.Files.Count(fi => !fi.IsDeleted) + f.Documents.Count(d => !d.IsDeleted),
                    CreatedAt = f.CreatedAt
                })
                .ToListAsync();

            return Ok(folders);
        }

        [HttpPost("folders")]
        public async Task<IActionResult> CreateFolder([FromBody] CreateFolderRequest request)
        {
            var userId = GetCurrentUserId();
            var folder = new Folder
            {
                UserId = userId,
                FolderName = request.FolderName.Trim(),
                ParentFolderId = request.ParentFolderId,
                Color = request.Color ?? "#38a9f6",
                CreatedAt = DateTime.UtcNow
            };

            _db.Folders.Add(folder);
            await _db.SaveChangesAsync();

            return Ok(new FolderDto
            {
                Id = folder.Id,
                FolderName = folder.FolderName,
                ParentFolderId = folder.ParentFolderId,
                Color = folder.Color,
                SubFolderCount = 0,
                FileCount = 0,
                CreatedAt = folder.CreatedAt
            });
        }

        // ==================== IMAGE INSERTION ====================

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadEditorImage([FromForm] IFormFile image)
        {
            if (image == null || image.Length == 0) return BadRequest(new { message = "No image file provided." });

            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            var safeName = $"img_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{ext}";
            var relativePath = await _storageService.SaveDirectFileAsync(safeName, image.OpenReadStream());

            var fullPath = Path.Combine(_storageService.GetStorageRoot(), relativePath);
            var checksum = await _storageService.CalculateChecksumAsync(fullPath);

            var fileItem = new FileItem
            {
                UserId = GetCurrentUserId(),
                FileName = Path.GetFileName(fullPath),
                OriginalFileName = image.FileName,
                FileSize = image.Length,
                FileExtension = ext,
                MimeType = image.ContentType ?? "image/png",
                StoragePath = relativePath,
                Checksum = checksum,
                FileCategory = "Image",
                UploadedAt = DateTime.UtcNow
            };

            _db.Files.Add(fileItem);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                url = $"/api/share/stream/{fileItem.Id}",
                fileId = fileItem.Id,
                fileName = fileItem.OriginalFileName
            });
        }

        // ==================== EXPORT PDF ====================

        [HttpPost("export-pdf")]
        public async Task<IActionResult> ExportToPdf([FromBody] ExportPdfRequest request)
        {
            try
            {
                var pdfBytes = await _pdfService.GeneratePdfFromDocumentAsync(
                    request.Title, 
                    request.ContentHtml, 
                    request.ContentJson);

                if (request.SaveToFiles)
                {
                    var userId = GetCurrentUserId();
                    var safeName = $"{request.Title.Replace(" ", "_")}_{DateTime.UtcNow:yyyyMMdd}.pdf";
                    using var stream = new MemoryStream(pdfBytes);
                    var relativePath = await _storageService.SaveDirectFileAsync(safeName, stream);

                    var fullPath = Path.Combine(_storageService.GetStorageRoot(), relativePath);
                    var checksum = await _storageService.CalculateChecksumAsync(fullPath);

                    var fileItem = new FileItem
                    {
                        UserId = userId,
                        FileName = Path.GetFileName(fullPath),
                        OriginalFileName = safeName,
                        FileSize = pdfBytes.Length,
                        FileExtension = ".pdf",
                        MimeType = "application/pdf",
                        StoragePath = relativePath,
                        Checksum = checksum,
                        FileCategory = "PDF",
                        UploadedAt = DateTime.UtcNow
                    };

                    _db.Files.Add(fileItem);

                    var studyNote = new StudyNote
                    {
                        UserId = userId,
                        File = fileItem,
                        DisplayName = request.Title,
                        ExtractedText = request.ContentJson,
                        ClassificationStatus = "Suggested",
                        UploadedAt = DateTime.UtcNow
                    };
                    _db.StudyNotes.Add(studyNote);

                    await _db.SaveChangesAsync();

                    return Ok(new
                    {
                        success = true,
                        fileId = fileItem.Id,
                        fileName = fileItem.OriginalFileName,
                        downloadUrl = $"/api/share/download/{fileItem.Id}",
                        streamUrl = $"/api/share/stream/{fileItem.Id}"
                    });
                }

                return File(pdfBytes, "application/pdf", $"{request.Title}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "PDF generation failed: " + ex.Message });
            }
        }
    }
}
