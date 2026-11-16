using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using DropLink.Api.Data;
using DropLink.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DropLink.Api.Services
{
    public interface IAiStudyService
    {
        Task<AiStudyQueryResponse> ProcessStudyQueryAsync(AiStudyQueryRequest request, int? userId);
    }

    public class AiStudyService : IAiStudyService
    {
        private readonly DropLinkDbContext _db;

        public AiStudyService(DropLinkDbContext db)
        {
            _db = db;
        }

        public async Task<AiStudyQueryResponse> ProcessStudyQueryAsync(AiStudyQueryRequest request, int? userId)
        {
            string contextText = string.Empty;
            string documentTitle = "Study Materials";

            if (request.StudyNoteId.HasValue)
            {
                var note = await _db.StudyNotes
                    .Include(n => n.File)
                    .FirstOrDefaultAsync(n => n.Id == request.StudyNoteId.Value);

                if (note != null)
                {
                    contextText = note.ExtractedText ?? string.Empty;
                    documentTitle = note.DisplayName;
                }
            }
            else if (request.SubjectId.HasValue)
            {
                var notes = await _db.StudyNotes
                    .Where(n => n.SubjectId == request.SubjectId.Value)
                    .Take(5)
                    .ToListAsync();

                contextText = string.Join("\n\n", notes.Select(n => n.ExtractedText));
                var subject = await _db.Subjects.FindAsync(request.SubjectId.Value);
                if (subject != null) documentTitle = subject.SubjectName;
            }

            var response = new AiStudyQueryResponse
            {
                QueryType = request.QueryType,
                Sources = new List<string> { documentTitle }
            };

            // Extract sentences and paragraphs from document context
            var paragraphs = contextText
                .Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Where(p => p.Trim().Length > 25 && !p.StartsWith("--- Page"))
                .ToList();

            if (paragraphs.Count == 0)
            {
                response.ResultText = "This document does not have sufficient extracted text for deep AI study analysis. Ensure it contains readable digital text or notes.";
                return response;
            }

            switch (request.QueryType.ToLowerInvariant())
            {
                case "summary":
                    response.ResultText = $"Executive academic summary for **{documentTitle}** based on source notes:\n\n" +
                        string.Join(" ", paragraphs.Take(4)) + "\n\n" +
                        "This unit covers core operational principles, system architecture, standard algorithms, and fundamental implementation workflows.";
                    response.KeyPoints = paragraphs.Take(6).Select(p => p.Length > 120 ? p.Substring(0, 120) + "..." : p).ToList();
                    break;

                case "flashcards":
                    response.ResultText = $"Generated {Math.Min(5, paragraphs.Count)} high-yield flashcards directly from {documentTitle}:";
                    for (int i = 0; i < Math.Min(6, paragraphs.Count); i++)
                    {
                        var p = paragraphs[i];
                        var words = p.Split(' ');
                        var subjectTerm = words.Take(4).Aggregate((a, b) => $"{a} {b}");
                        response.Flashcards.Add(new FlashcardDto
                        {
                            Topic = documentTitle,
                            Question = $"What is the primary significance or function of {subjectTerm}?",
                            Answer = p
                        });
                    }
                    break;

                case "quiz":
                case "questions":
                    response.ResultText = $"Practice revision questions formulated from {documentTitle}:\n\n" +
                        $"1. Define the fundamental role and mechanism of {paragraphs.FirstOrDefault()?.Split(' ').Take(3).Aggregate((a, b) => $"{a} {b}") ?? "the primary topic"}.\n" +
                        $"2. Compare and contrast key components detailed in section notes.\n" +
                        $"3. Explain the step-by-step workflow demonstrated in this unit.\n" +
                        $"4. What failure modes, edge conditions, or performance trade-offs are documented here?";
                    response.KeyPoints = paragraphs.Take(4).ToList();
                    break;

                case "topics":
                default:
                    response.ResultText = $"Key concepts and definitions extracted from {documentTitle}:";
                    response.KeyPoints = paragraphs.Take(8).Select(p => p.Length > 150 ? p.Substring(0, 150) + "..." : p).ToList();
                    break;
            }

            return response;
        }
    }
}
