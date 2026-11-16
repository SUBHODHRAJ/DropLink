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
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DropLink.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudyController : ControllerBase
    {
        private readonly DropLinkDbContext _db;
        private readonly ISmartOrganizationService _orgService;
        private readonly IAiStudyService _aiService;
        private readonly IPdfService _pdfService;
        private readonly IStorageService _storageService;

        public StudyController(
            DropLinkDbContext db,
            ISmartOrganizationService orgService,
            IAiStudyService aiService,
            IPdfService pdfService,
            IStorageService storageService)
        {
            _db = db;
            _orgService = orgService;
            _aiService = aiService;
            _pdfService = pdfService;
            _storageService = storageService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id)) return id;
            return null;
        }

        // 1. Dashboard Stats
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var userId = GetCurrentUserId();

            var totalSubjects = await _db.Subjects.CountAsync(s => userId == null || s.UserId == userId);
            var totalNotes = await _db.StudyNotes.CountAsync(n => userId == null || n.UserId == userId);
            var totalPdfs = await _db.Files.CountAsync(f => (userId == null || f.UserId == userId) && !f.IsDeleted && f.FileExtension == ".pdf");
            var pendingReviews = await _db.StudyNotes.CountAsync(n => (userId == null || n.UserId == userId) && (n.ClassificationStatus == "Suggested" || n.ClassificationStatus == "NeedsReview"));

            var recentNotes = await _db.StudyNotes
                .Include(n => n.Subject)
                .Include(n => n.File)
                .Where(n => userId == null || n.UserId == userId)
                .OrderByDescending(n => n.UploadedAt)
                .Take(6)
                .Select(n => new StudyNoteDto
                {
                    Id = n.Id,
                    FolderId = n.FolderId,
                    SubjectId = n.SubjectId,
                    SubjectName = n.Subject != null ? n.Subject.SubjectName : "Unassigned",
                    Semester = n.Subject != null ? n.Subject.Semester : "General",
                    FileId = n.FileId,
                    FileName = n.File.OriginalFileName,
                    DisplayName = n.DisplayName,
                    FileSize = n.File.FileSize,
                    ClassificationStatus = n.ClassificationStatus,
                    IsFavorite = n.IsFavorite,
                    UploadedAt = n.UploadedAt,
                    LastOpenedAt = n.LastOpenedAt
                })
                .ToListAsync();

            var semesters = await _db.Subjects
                .Where(s => userId == null || s.UserId == userId)
                .Select(s => s.Semester)
                .Distinct()
                .ToListAsync();

            return Ok(new
            {
                totalSubjects,
                totalNotes,
                totalPdfs,
                totalSemesters = semesters.Count,
                pendingReviews,
                recentNotes,
                semesters
            });
        }

        // 2. Subjects Management
        [HttpGet("subjects")]
        public async Task<IActionResult> GetSubjects([FromQuery] string? semester)
        {
            var userId = GetCurrentUserId();
            var query = _db.Subjects
                .Include(s => s.StudyFolders)
                .Where(s => userId == null || s.UserId == userId);

            if (!string.IsNullOrEmpty(semester))
            {
                query = query.Where(s => s.Semester == semester);
            }

            var list = await query
                .OrderBy(s => s.Semester)
                .ThenBy(s => s.SubjectName)
                .Select(s => new SubjectDto
                {
                    Id = s.Id,
                    SubjectName = s.SubjectName,
                    SubjectCode = s.SubjectCode,
                    Semester = s.Semester,
                    Description = s.Description,
                    Color = s.Color,
                    Icon = s.Icon,
                    NotesCount = _db.StudyNotes.Count(n => n.SubjectId == s.Id),
                    CreatedAt = s.CreatedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        [HttpPost("subjects")]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectRequest request)
        {
            var userId = GetCurrentUserId();
            var subject = new Subject
            {
                UserId = userId,
                SubjectName = request.SubjectName.Trim(),
                SubjectCode = request.SubjectCode.Trim(),
                Semester = string.IsNullOrWhiteSpace(request.Semester) ? "Semester 1" : request.Semester.Trim(),
                Description = request.Description,
                Color = request.Color ?? "#38a9f6",
                Icon = request.Icon ?? "BookOpen",
                CreatedAt = DateTime.UtcNow
            };

            _db.Subjects.Add(subject);
            await _db.SaveChangesAsync();

            return Ok(new SubjectDto
            {
                Id = subject.Id,
                SubjectName = subject.SubjectName,
                SubjectCode = subject.SubjectCode,
                Semester = subject.Semester,
                Description = subject.Description,
                Color = subject.Color,
                Icon = subject.Icon,
                NotesCount = 0,
                CreatedAt = subject.CreatedAt
            });
        }

        [HttpDelete("subjects/{id}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            var subject = await _db.Subjects.FindAsync(id);
            if (subject == null) return NotFound(new { message = "Subject not found." });

            _db.Subjects.Remove(subject);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Subject deleted." });
        }

        // 3. Study Folders
        [HttpGet("folders")]
        public async Task<IActionResult> GetStudyFolders([FromQuery] int? subjectId)
        {
            var userId = GetCurrentUserId();
            var query = _db.StudyFolders.Where(f => userId == null || f.UserId == userId);

            if (subjectId.HasValue)
            {
                query = query.Where(f => f.SubjectId == subjectId.Value);
            }

            var list = await query
                .Select(f => new StudyFolderDto
                {
                    Id = f.Id,
                    FolderName = f.FolderName,
                    ParentFolderId = f.ParentFolderId,
                    SubjectId = f.SubjectId,
                    UnitNumber = f.UnitNumber,
                    NotesCount = f.StudyNotes.Count,
                    CreatedAt = f.CreatedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        [HttpPost("folders")]
        public async Task<IActionResult> CreateStudyFolder([FromBody] CreateStudyFolderRequest request)
        {
            var userId = GetCurrentUserId();
            var folder = new StudyFolder
            {
                UserId = userId,
                FolderName = request.FolderName.Trim(),
                ParentFolderId = request.ParentFolderId,
                SubjectId = request.SubjectId,
                UnitNumber = request.UnitNumber,
                CreatedAt = DateTime.UtcNow
            };

            _db.StudyFolders.Add(folder);
            await _db.SaveChangesAsync();

            return Ok(new StudyFolderDto
            {
                Id = folder.Id,
                FolderName = folder.FolderName,
                ParentFolderId = folder.ParentFolderId,
                SubjectId = folder.SubjectId,
                UnitNumber = folder.UnitNumber,
                NotesCount = 0,
                CreatedAt = folder.CreatedAt
            });
        }

        // 4. Study Notes List & Details
        [HttpGet("notes")]
        public async Task<IActionResult> GetStudyNotes([FromQuery] int? subjectId, [FromQuery] int? folderId, [FromQuery] string? status)
        {
            var userId = GetCurrentUserId();
            var query = _db.StudyNotes
                .Include(n => n.Subject)
                .Include(n => n.Folder)
                .Include(n => n.File)
                .Where(n => userId == null || n.UserId == userId);

            if (subjectId.HasValue) query = query.Where(n => n.SubjectId == subjectId.Value);
            if (folderId.HasValue) query = query.Where(n => n.FolderId == folderId.Value);
            if (!string.IsNullOrEmpty(status)) query = query.Where(n => n.ClassificationStatus == status);

            var list = await query
                .OrderByDescending(n => n.UploadedAt)
                .Select(n => new StudyNoteDto
                {
                    Id = n.Id,
                    FolderId = n.FolderId,
                    FolderName = n.Folder != null ? n.Folder.FolderName : null,
                    SubjectId = n.SubjectId,
                    SubjectName = n.Subject != null ? n.Subject.SubjectName : null,
                    Semester = n.Subject != null ? n.Subject.Semester : null,
                    FileId = n.FileId,
                    FileName = n.File.OriginalFileName,
                    DisplayName = n.DisplayName,
                    FileSize = n.File.FileSize,
                    ClassificationStatus = n.ClassificationStatus,
                    SuggestedSubject = n.SuggestedSubject,
                    SuggestedUnit = n.SuggestedUnit,
                    ConfidenceScore = n.ConfidenceScore,
                    IsFavorite = n.IsFavorite,
                    UploadedAt = n.UploadedAt,
                    LastOpenedAt = n.LastOpenedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        [HttpGet("notes/{id}")]
        public async Task<IActionResult> GetStudyNoteById(int id)
        {
            var note = await _db.StudyNotes
                .Include(n => n.Subject)
                .Include(n => n.Folder)
                .Include(n => n.File)
                .Include(n => n.Bookmarks)
                .Include(n => n.Annotations)
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null) return NotFound(new { message = "Study note not found." });

            note.LastOpenedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                note.Id,
                note.DisplayName,
                note.FolderId,
                FolderName = note.Folder?.FolderName,
                note.SubjectId,
                SubjectName = note.Subject?.SubjectName,
                Semester = note.Subject?.Semester,
                note.FileId,
                FileName = note.File.OriginalFileName,
                FileSize = note.File.FileSize,
                note.ExtractedText,
                note.ClassificationStatus,
                note.IsFavorite,
                StreamUrl = $"/api/share/stream/{note.FileId}",
                DownloadUrl = $"/api/share/download/{note.FileId}",
                Bookmarks = note.Bookmarks.Select(b => new BookmarkDto
                {
                    Id = b.Id,
                    StudyNoteId = b.StudyNoteId,
                    PageNumber = b.PageNumber,
                    Title = b.Title,
                    CreatedAt = b.CreatedAt
                }),
                Annotations = note.Annotations.Select(a => new AnnotationDto
                {
                    Id = a.Id,
                    StudyNoteId = a.StudyNoteId,
                    PageNumber = a.PageNumber,
                    AnnotationType = a.AnnotationType,
                    AnnotationContent = a.AnnotationContent,
                    Color = a.Color,
                    CreatedAt = a.CreatedAt
                })
            });
        }

        // 5. Smart Automatic Organization Engine
        [HttpGet("smart-suggestions")]
        public async Task<IActionResult> GetSmartSuggestions()
        {
            var userId = GetCurrentUserId();
            var suggestions = await _orgService.AnalyzePendingNotesAsync(userId);
            return Ok(suggestions);
        }

        [HttpPost("approve-organization")]
        public async Task<IActionResult> ApproveOrganization([FromBody] ApproveOrganizationRequest request)
        {
            var userId = GetCurrentUserId();
            var success = await _orgService.ApplyOrganizationAsync(request, userId);
            return Ok(new { success, message = "Organization structure successfully updated." });
        }

        // 6. Smart Academic Full-Text Search
        [HttpGet("search")]
        public async Task<IActionResult> AcademicSearch([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q)) return Ok(new List<SearchResultDto>());

            var term = q.Trim().ToLowerInvariant();
            var userId = GetCurrentUserId();

            var notes = await _db.StudyNotes
                .Include(n => n.Subject)
                .Include(n => n.Folder)
                .Include(n => n.File)
                .Where(n => (userId == null || n.UserId == userId) &&
                            (EF.Functions.Like(n.DisplayName.ToLower(), $"%{term}%") ||
                             EF.Functions.Like(n.File.OriginalFileName.ToLower(), $"%{term}%") ||
                             (n.ExtractedText != null && EF.Functions.Like(n.ExtractedText.ToLower(), $"%{term}%")) ||
                             (n.Subject != null && EF.Functions.Like(n.Subject.SubjectName.ToLower(), $"%{term}%"))))
                .Take(25)
                .ToListAsync();

            var results = new List<SearchResultDto>();

            foreach (var note in notes)
            {
                string snippet = string.Empty;
                int? page = null;

                if (!string.IsNullOrEmpty(note.ExtractedText))
                {
                    var idx = note.ExtractedText.IndexOf(term, StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0)
                    {
                        var start = Math.Max(0, idx - 60);
                        var length = Math.Min(note.ExtractedText.Length - start, 180);
                        snippet = "..." + note.ExtractedText.Substring(start, length).Replace("\n", " ") + "...";

                        // Try to find page number from marker
                        var precedingText = note.ExtractedText.Substring(0, idx);
                        var pageMarker = precedingText.LastIndexOf("--- Page ", StringComparison.OrdinalIgnoreCase);
                        if (pageMarker >= 0)
                        {
                            var pagePart = precedingText.Substring(pageMarker + 9, 6);
                            var numStr = new string(pagePart.TakeWhile(char.IsDigit).ToArray());
                            if (int.TryParse(numStr, out var p)) page = p;
                        }
                    }
                }

                if (string.IsNullOrEmpty(snippet))
                {
                    snippet = $"Matches metadata for {note.DisplayName} in {note.Subject?.SubjectName ?? "Study Notes"}";
                }

                results.Add(new SearchResultDto
                {
                    StudyNoteId = note.Id,
                    FileId = note.FileId,
                    Title = note.DisplayName,
                    Subject = note.Subject?.SubjectName ?? "General Academic",
                    Semester = note.Subject?.Semester ?? "N/A",
                    FolderPath = note.Folder != null ? $"{note.Subject?.SubjectName} / {note.Folder.FolderName}" : note.Subject?.SubjectName ?? "Root",
                    Snippet = snippet,
                    PageNumber = page,
                    MatchScore = 1.0
                });
            }

            if (results.Count == 0)
            {
                var matchingSubjects = await _db.Subjects
                    .Where(s => (userId == null || s.UserId == userId) &&
                                (EF.Functions.Like(s.SubjectName.ToLower(), $"%{term}%") ||
                                 EF.Functions.Like(s.SubjectCode.ToLower(), $"%{term}%") ||
                                 EF.Functions.Like(s.Description.ToLower(), $"%{term}%")))
                    .Take(10)
                    .ToListAsync();

                foreach (var sub in matchingSubjects)
                {
                    results.Add(new SearchResultDto
                    {
                        StudyNoteId = 0,
                        FileId = 0,
                        Title = sub.SubjectName,
                        Subject = sub.SubjectName,
                        Semester = sub.Semester,
                        FolderPath = sub.Semester,
                        Snippet = $"Academic subject: {sub.SubjectName} ({sub.SubjectCode}). {sub.Description}",
                        PageNumber = null,
                        MatchScore = 0.9
                    });
                }
            }

            return Ok(results);
        }

        // 7. Bookmarks
        [HttpPost("bookmarks")]
        public async Task<IActionResult> AddBookmark([FromBody] BookmarkDto request)
        {
            var bookmark = new Bookmark
            {
                UserId = GetCurrentUserId(),
                StudyNoteId = request.StudyNoteId,
                PageNumber = request.PageNumber,
                Title = string.IsNullOrWhiteSpace(request.Title) ? $"Page {request.PageNumber}" : request.Title.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.Bookmarks.Add(bookmark);
            await _db.SaveChangesAsync();

            return Ok(new BookmarkDto
            {
                Id = bookmark.Id,
                StudyNoteId = bookmark.StudyNoteId,
                PageNumber = bookmark.PageNumber,
                Title = bookmark.Title,
                CreatedAt = bookmark.CreatedAt
            });
        }

        [HttpDelete("bookmarks/{id}")]
        public async Task<IActionResult> DeleteBookmark(int id)
        {
            var bookmark = await _db.Bookmarks.FindAsync(id);
            if (bookmark == null) return NotFound(new { message = "Bookmark not found." });

            _db.Bookmarks.Remove(bookmark);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Bookmark removed." });
        }

        // 8. Annotations
        [HttpPost("annotations")]
        public async Task<IActionResult> AddAnnotation([FromBody] AnnotationDto request)
        {
            var annotation = new Annotation
            {
                UserId = GetCurrentUserId(),
                StudyNoteId = request.StudyNoteId,
                PageNumber = request.PageNumber,
                AnnotationType = request.AnnotationType ?? "Highlight",
                AnnotationContent = request.AnnotationContent,
                Color = request.Color ?? "#fef08a",
                CreatedAt = DateTime.UtcNow
            };

            _db.Annotations.Add(annotation);
            await _db.SaveChangesAsync();

            return Ok(new AnnotationDto
            {
                Id = annotation.Id,
                StudyNoteId = annotation.StudyNoteId,
                PageNumber = annotation.PageNumber,
                AnnotationType = annotation.AnnotationType,
                AnnotationContent = annotation.AnnotationContent,
                Color = annotation.Color,
                CreatedAt = annotation.CreatedAt
            });
        }

        // 9. AI Study Assistant
        [HttpPost("ai-query")]
        public async Task<IActionResult> QueryAiStudy([FromBody] AiStudyQueryRequest request)
        {
            var userId = GetCurrentUserId();
            var response = await _aiService.ProcessStudyQueryAsync(request, userId);
            return Ok(response);
        }

        // 10. PDF Tools: Merge Multiple PDFs
        [HttpPost("merge-pdfs")]
        public async Task<IActionResult> MergePdfs([FromBody] MergePdfsRequest request)
        {
            if (request.FileIds == null || request.FileIds.Count < 2)
            {
                return BadRequest(new { message = "At least two PDFs are required for merging." });
            }

            var files = await _db.Files.Where(f => request.FileIds.Contains(f.Id)).ToListAsync();
            var filePaths = files.Select(f => Path.Combine(_storageService.GetStorageRoot(), f.StoragePath)).ToList();

            var mergedBytes = await _pdfService.MergePdfsAsync(filePaths);
            var safeName = $"{request.MergedTitle ?? "Merged_Document"}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";

            using var stream = new MemoryStream(mergedBytes);
            var relativePath = await _storageService.SaveDirectFileAsync(safeName, stream);
            var fullPath = Path.Combine(_storageService.GetStorageRoot(), relativePath);
            var checksum = await _storageService.CalculateChecksumAsync(fullPath);

            var fileRecord = new FileItem
            {
                UserId = GetCurrentUserId(),
                FileName = Path.GetFileName(fullPath),
                OriginalFileName = safeName,
                FileSize = mergedBytes.Length,
                FileExtension = ".pdf",
                MimeType = "application/pdf",
                StoragePath = relativePath,
                Checksum = checksum,
                FileCategory = "PDF",
                UploadedAt = DateTime.UtcNow
            };

            _db.Files.Add(fileRecord);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                fileId = fileRecord.Id,
                fileName = fileRecord.OriginalFileName,
                fileSize = fileRecord.FileSize,
                downloadUrl = $"/api/share/download/{fileRecord.Id}"
            });
        }
    }

    public class MergePdfsRequest
    {
        public List<int> FileIds { get; set; } = new List<int>();
        public string? MergedTitle { get; set; } = "Merged_Notes";
    }
}
