using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using DropLink.Api.Data;
using DropLink.Api.DTOs;
using DropLink.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DropLink.Api.Services
{
    public class SmartOrganizationService : ISmartOrganizationService
    {
        private readonly DropLinkDbContext _db;
        private readonly IPdfService _pdfService;
        private readonly IStorageService _storageService;
        private readonly ILogger<SmartOrganizationService> _logger;

        private static readonly Dictionary<string, (string FullName, string Code, string DefaultSem)> AcademicSubjectCatalog = new(StringComparer.OrdinalIgnoreCase)
        {
            ["DBMS"] = ("Database Management Systems", "CS402", "Semester 4"),
            ["DATABASE"] = ("Database Management Systems", "CS402", "Semester 4"),
            ["SQL"] = ("Database Management Systems", "CS402", "Semester 4"),
            ["OS"] = ("Operating Systems", "CS401", "Semester 4"),
            ["OPERATING SYSTEM"] = ("Operating Systems", "CS401", "Semester 4"),
            ["OPERATING SYSTEMS"] = ("Operating Systems", "CS401", "Semester 4"),
            ["CN"] = ("Computer Networks", "CS501", "Semester 5"),
            ["COMPUTER NETWORK"] = ("Computer Networks", "CS501", "Semester 5"),
            ["NETWORKING"] = ("Computer Networks", "CS501", "Semester 5"),
            ["DSA"] = ("Data Structures & Algorithms", "CS301", "Semester 3"),
            ["DATA STRUCTURES"] = ("Data Structures & Algorithms", "CS301", "Semester 3"),
            ["ALGORITHMS"] = ("Design & Analysis of Algorithms", "CS403", "Semester 4"),
            ["DAA"] = ("Design & Analysis of Algorithms", "CS403", "Semester 4"),
            ["SE"] = ("Software Engineering", "CS502", "Semester 5"),
            ["SOFTWARE ENGINEERING"] = ("Software Engineering", "CS502", "Semester 5"),
            ["ML"] = ("Machine Learning", "CS601", "Semester 6"),
            ["MACHINE LEARNING"] = ("Machine Learning", "CS601", "Semester 6"),
            ["AI"] = ("Artificial Intelligence", "CS602", "Semester 6"),
            ["ARTIFICIAL INTELLIGENCE"] = ("Artificial Intelligence", "CS602", "Semester 6"),
            ["TOC"] = ("Theory of Computation", "CS503", "Semester 5"),
            ["AUTOMATA"] = ("Theory of Computation", "CS503", "Semester 5"),
            ["COA"] = ("Computer Organization & Architecture", "CS302", "Semester 3"),
            ["MATHS"] = ("Engineering Mathematics", "MA101", "Semester 1"),
            ["MATHEMATICS"] = ("Engineering Mathematics", "MA101", "Semester 1"),
            ["PHYSICS"] = ("Engineering Physics", "PH101", "Semester 1"),
            ["OOPS"] = ("Object Oriented Programming", "CS201", "Semester 2"),
            ["OOP"] = ("Object Oriented Programming", "CS201", "Semester 2"),
            ["WEB DEV"] = ("Web Technologies", "CS504", "Semester 5"),
            ["CYBER SECURITY"] = ("Cyber Security", "CS701", "Semester 7")
        };

        public SmartOrganizationService(
            DropLinkDbContext db,
            IPdfService pdfService,
            IStorageService storageService,
            ILogger<SmartOrganizationService> logger)
        {
            _db = db;
            _pdfService = pdfService;
            _storageService = storageService;
            _logger = logger;
        }

        public async Task<SuggestedOrganizationDto> AnalyzeDocumentAsync(int studyNoteId)
        {
            var note = await _db.StudyNotes
                .Include(n => n.File)
                .Include(n => n.Subject)
                .FirstOrDefaultAsync(n => n.Id == studyNoteId);

            if (note == null || note.File == null)
            {
                throw new ArgumentException("Study note or file not found.");
            }

            var fullPath = Path.Combine(_storageService.GetStorageRoot(), note.File.StoragePath);
            string extractedText = note.ExtractedText ?? string.Empty;

            // Extract text if not yet extracted
            if (string.IsNullOrWhiteSpace(extractedText) && File.Exists(fullPath) && note.File.FileExtension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                var (text, _, _) = _pdfService.ExtractTextAndMetadata(fullPath);
                note.ExtractedText = text;
                extractedText = text;
                await _db.SaveChangesAsync();
            }

            var filename = note.File.OriginalFileName;
            var combinedCorpus = $"{filename} {extractedText.Take(3000).ToArray()}";

            string? detectedSubject = null;
            string? detectedSemester = null;
            string? detectedUnit = null;
            double confidence = 0.3;
            var topics = new List<string>();

            // 1. Identify Subject
            foreach (var kvp in AcademicSubjectCatalog)
            {
                var pattern = $@"\b{Regex.Escape(kvp.Key)}\b";
                if (Regex.IsMatch(filename, pattern, RegexOptions.IgnoreCase))
                {
                    detectedSubject = kvp.Value.FullName;
                    detectedSemester = kvp.Value.DefaultSem;
                    confidence += 0.45;
                    break;
                }
                else if (Regex.IsMatch(extractedText, pattern, RegexOptions.IgnoreCase))
                {
                    detectedSubject = kvp.Value.FullName;
                    detectedSemester = kvp.Value.DefaultSem;
                    confidence += 0.30;
                    break;
                }
            }

            // 2. Identify Unit / Module / Chapter / Lecture
            var unitMatch = Regex.Match(combinedCorpus, @"\b(Unit\s*[-_]?\s*[0-9IVX]+|Module\s*[-_]?\s*[0-9IVX]+|Chapter\s*[-_]?\s*[0-9IVX]+|Lecture\s*[-_]?\s*[0-9IVX]+)\b", RegexOptions.IgnoreCase);
            if (unitMatch.Success)
            {
                detectedUnit = unitMatch.Value.Replace("_", " ").Trim();
                confidence += 0.2;
            }

            // 3. Identify Semester if explicitly mentioned
            var semMatch = Regex.Match(combinedCorpus, @"\b(Sem(ester)?\s*[-_]?\s*[1-8])\b", RegexOptions.IgnoreCase);
            if (semMatch.Success)
            {
                detectedSemester = Regex.Replace(semMatch.Value, @"\s+", " ").Trim();
                confidence += 0.15;
            }

            // 4. Topic extraction (look for common keywords)
            var keywords = new[] { "Normalization", "Indexing", "Deadlock", "Process Scheduling", "Paging", "TCP/IP", "Routing", "Binary Tree", "Sorting", "Graph", "Inheritance", "Polymorphism", "Recursion", "Relational Algebra", "ACID", "Transactions", "OSI Model" };
            foreach (var kw in keywords)
            {
                if (combinedCorpus.IndexOf(kw, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    topics.Add(kw);
                }
            }

            confidence = Math.Min(0.98, Math.Round(confidence, 2));

            // Generate cleaned readable title
            var cleanTitle = Path.GetFileNameWithoutExtension(filename)
                .Replace("_", " ")
                .Replace("-", " ");
            
            if (!string.IsNullOrEmpty(detectedSubject) && !string.IsNullOrEmpty(detectedUnit))
            {
                cleanTitle = $"{detectedSubject} - {detectedUnit}";
            }
            else if (!string.IsNullOrEmpty(detectedSubject))
            {
                cleanTitle = $"{detectedSubject} Notes";
            }

            var reason = confidence >= 0.7 
                ? $"High confidence match from document contents ({detectedSubject})"
                : confidence >= 0.5 
                    ? "Probable match based on filename and contents"
                    : "Low confidence; recommended for manual review.";

            // Save suggestion on note
            note.SuggestedSubject = detectedSubject;
            note.SuggestedUnit = detectedUnit;
            note.ConfidenceScore = confidence;
            note.ClassificationStatus = confidence >= 0.5 ? "Suggested" : "NeedsReview";
            await _db.SaveChangesAsync();

            return new SuggestedOrganizationDto
            {
                StudyNoteId = note.Id,
                FileId = note.FileId,
                OriginalFileName = filename,
                SuggestedTitle = cleanTitle,
                SuggestedSubject = detectedSubject ?? "General Academic",
                SuggestedSemester = detectedSemester ?? "Semester 1",
                SuggestedUnit = detectedUnit ?? "Unit 1",
                ConfidenceScore = confidence,
                Reason = reason,
                ExtractedTopics = topics.Take(5).ToList()
            };
        }

        public async Task<List<SuggestedOrganizationDto>> AnalyzePendingNotesAsync(int? userId)
        {
            var pendingNotes = await _db.StudyNotes
                .Where(n => n.UserId == userId && (n.ClassificationStatus == "Suggested" || n.ClassificationStatus == "NeedsReview" || n.FolderId == null))
                .Take(20)
                .ToListAsync();

            var results = new List<SuggestedOrganizationDto>();
            foreach (var note in pendingNotes)
            {
                try
                {
                    var suggestion = await AnalyzeDocumentAsync(note.Id);
                    results.Add(suggestion);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to analyze study note {NoteId}", note.Id);
                }
            }

            return results;
        }

        public async Task<bool> ApplyOrganizationAsync(ApproveOrganizationRequest request, int? userId)
        {
            foreach (var item in request.Items)
            {
                var note = await _db.StudyNotes
                    .Include(n => n.File)
                    .FirstOrDefaultAsync(n => n.Id == item.StudyNoteId && n.UserId == userId);

                if (note == null) continue;

                // Find or create Subject
                Subject? subject = null;
                if (item.SubjectId.HasValue && item.SubjectId.Value > 0)
                {
                    subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == item.SubjectId.Value && s.UserId == userId);
                }
                else if (!string.IsNullOrWhiteSpace(item.SubjectName))
                {
                    subject = await _db.Subjects.FirstOrDefaultAsync(s => s.SubjectName.ToLower() == item.SubjectName.ToLower() && s.UserId == userId);
                    if (subject == null)
                    {
                        subject = new Subject
                        {
                            UserId = userId,
                            SubjectName = item.SubjectName.Trim(),
                            Semester = item.Semester ?? "General",
                            Color = "#38a9f6",
                            Icon = "BookOpen",
                            CreatedAt = DateTime.UtcNow
                        };
                        _db.Subjects.Add(subject);
                        await _db.SaveChangesAsync();
                    }
                }

                // Find or create StudyFolder for Unit
                StudyFolder? folder = null;
                if (subject != null)
                {
                    var folderName = item.UnitNumber ?? "General Notes";
                    folder = await _db.StudyFolders.FirstOrDefaultAsync(f => f.SubjectId == subject.Id && f.FolderName == folderName);
                    if (folder == null)
                    {
                        folder = new StudyFolder
                        {
                            UserId = userId,
                            SubjectId = subject.Id,
                            FolderName = folderName,
                            UnitNumber = item.UnitNumber,
                            CreatedAt = DateTime.UtcNow
                        };
                        _db.StudyFolders.Add(folder);
                        await _db.SaveChangesAsync();
                    }
                }

                note.SubjectId = subject?.Id;
                note.FolderId = folder?.Id;
                if (!string.IsNullOrWhiteSpace(item.NewDisplayName))
                {
                    note.DisplayName = item.NewDisplayName.Trim();
                }
                note.ClassificationStatus = "Organized";
            }

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
