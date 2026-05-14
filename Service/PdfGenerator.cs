using QuestPDF.Elements.Table;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ŽVPAIS_API.Models;

namespace ŽVPAIS_API.Services
{
    public static class PdfGenerator
    {
        public static byte[] Generate(Event ev, DamageEvaluation? report, EventDamageBreakdownDto breakdown, byte[]? mapImageBytes, byte[]? dispersionImageBytes = null)
        {
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                    page.Header().Column(header =>
                    {
                        header.Item().Text("Žalos Vertinimo Ataskaita")
                            .SemiBold().FontSize(18).FontColor(Colors.Blue.Darken2);
                        header.Item().PaddingTop(2).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                    });

                    page.Content().PaddingTop(12).Column(col =>
                    {
                        // Event info table
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(130);
                                c.RelativeColumn();
                            });

                            void Row(string label, string value)
                            {
                                table.Cell().PaddingBottom(4).Text(label).SemiBold();
                                table.Cell().PaddingBottom(4).Text(value);
                            }

                            Row("Įvykio tipas:", EventTypeLabel(ev.EventType));
                            Row("Įvykio data:", ev.EventDate.ToLocalTime().ToString("yyyy-MM-dd"));
                            if (!string.IsNullOrEmpty(ev.Location))
                                Row("Vieta:", ev.Location);
                            Row("Statusas:", StatusLabel(ev.Status));
                            if (report != null)
                                Row("Vertinimo data:", report.Data.ToString("yyyy-MM-dd"));
                            Row("Indeksavimo koef. (Iₙ):", breakdown.IndexingCoefficient.ToString("F4"));
                        });

                        // Map image
                        if (mapImageBytes is { Length: > 0 })
                        {
                            col.Item().PaddingTop(12)
                                .Border(1).BorderColor(Colors.Grey.Lighten2)
                                .Image(mapImageBytes).FitWidth();
                        }

                        col.Item().PaddingTop(14)
                            .Text("Žalos skaičiavimo suvestinė")
                            .SemiBold().FontSize(12);

                        col.Item().PaddingTop(6);

                        // Per-object breakdown tables
                        foreach (var obj in breakdown.Objects)
                        {
                            var header = $"{obj.ObjectName}  ({ComponentLabel(obj.ComponentType)})";
                            if (obj.KKat.HasValue)
                                header += $"  K_kat: {obj.KKat:F2}";

                            col.Item().PaddingBottom(4).Text(header).SemiBold().FontSize(10);

                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.RelativeColumn(3);
                                    c.RelativeColumn(2);
                                    c.RelativeColumn(1.5f);
                                    c.RelativeColumn(1.5f);
                                    c.RelativeColumn(1.5f);
                                    c.RelativeColumn(1.5f);
                                    c.RelativeColumn(2);
                                });

                                static void HeaderCell(ITableCellContainer cell, string text) =>
                                    cell.Background(Colors.Grey.Lighten3).Padding(4).Text(text).SemiBold().FontSize(8);

                                HeaderCell(table.Cell(), "Medžiaga");
                                HeaderCell(table.Cell(), "Tipas");
                                HeaderCell(table.Cell(), "Tₙ (€/t)");
                                HeaderCell(table.Cell(), "Iₙ");
                                HeaderCell(table.Cell(), "Qₙ (t)");
                                HeaderCell(table.Cell(), "K_kat");
                                HeaderCell(table.Cell(), "Zₙ (€)");

                                foreach (var m in obj.Materials)
                                {
                                    static void DataCell(ITableCellContainer cell, string text, bool bold = false)
                                    {
                                        var t = cell.BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(text).FontSize(8);
                                        if (bold) t.SemiBold();
                                    }

                                    DataCell(table.Cell(), m.MaterialName ?? "");
                                    DataCell(table.Cell(), SubstanceLabel(m.SubstanceType));
                                    DataCell(table.Cell(), m.TN.ToString("F2"));
                                    DataCell(table.Cell(), m.IN.ToString("F4"));
                                    DataCell(table.Cell(), m.QN.ToString("F4"));
                                    DataCell(table.Cell(), m.KKat.ToString("F2"));
                                    DataCell(table.Cell(), m.ZN.ToString("F2") + " €", bold: true);
                                }

                                // Object total row
                                static void TotalCell(ITableCellContainer cell, string text, bool highlight = false)
                                {
                                    var t = cell.Background(Colors.Orange.Lighten5).Padding(4).Text(text).SemiBold().FontSize(8);
                                    if (highlight) t.FontColor(Colors.Red.Darken2);
                                }

                                TotalCell(table.Cell(), "");
                                TotalCell(table.Cell(), "");
                                TotalCell(table.Cell(), "");
                                TotalCell(table.Cell(), "");
                                TotalCell(table.Cell(), "");
                                TotalCell(table.Cell(), "Objekto suma:");
                                TotalCell(table.Cell(), $"{obj.ObjectDamage:F2} €", highlight: true);
                            });

                            col.Item().PaddingBottom(10);
                        }

                        // Grand total
                        col.Item()
                            .AlignRight()
                            .Text($"Bendra žala: {breakdown.TotalDamage:F2} €")
                            .SemiBold().FontSize(14).FontColor(Colors.Red.Darken2);

                        if (report?.Notes is { Length: > 0 } notes)
                        {
                            col.Item().PaddingTop(12).Text("Pastabos:").SemiBold();
                            col.Item().PaddingTop(4).Text(notes);
                        }
                    });

                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Sugeneruota: ").FontSize(8).FontColor(Colors.Grey.Medium);
                        x.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm")).FontSize(8).FontColor(Colors.Grey.Medium);
                    });
                });
                // Dispersion page — only for fire events when image was captured
                if (dispersionImageBytes is { Length: > 0 } && ev.EventType == "gaisras")
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(2, Unit.Centimetre);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                        page.Header().Column(header =>
                        {
                            header.Item().Text("Teršalų sklaidos vėjo žemėlapis")
                                .SemiBold().FontSize(16).FontColor(Colors.Blue.Darken2);
                            header.Item().PaddingTop(2).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                        });

                        page.Content().PaddingTop(12).Column(col =>
                        {
                            col.Item()
                                .Text($"Įvykis #{ev.IdEvent} · {ev.EventDate.ToLocalTime():yyyy-MM-dd} · {(string.IsNullOrEmpty(ev.Location) ? "" : ev.Location)}")
                                .FontSize(9).FontColor(Colors.Grey.Medium);

                            col.Item().PaddingTop(4)
                                .Text("Vėjo sklaidos modelis. Pavaizduotas didžiausios emisijos junginio sklaidos laukas įvykio metu.")
                                .FontSize(9).FontColor(Colors.Grey.Medium);

                            col.Item().PaddingTop(10)
                                .Border(1).BorderColor(Colors.Grey.Lighten2)
                                .Image(dispersionImageBytes).FitWidth();

                            col.Item().PaddingTop(10).Text("Koncentracijos (µg/m³):").SemiBold().FontSize(9);

                            col.Item().PaddingTop(4).Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn();
                                    c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn();
                                });
                                void Band(string label, string hex)
                                {
                                    var r = Convert.ToByte(hex[1..3], 16);
                                    var g = Convert.ToByte(hex[3..5], 16);
                                    var b = Convert.ToByte(hex[5..7], 16);
                                    table.Cell()
                                        .Background($"#{hex[1..]}").Padding(4)
                                        .Text(label).FontSize(8)
                                        .FontColor(r + g + b < 382 ? Colors.White : Colors.Black);
                                }
                                Band("< 1", "#c7e9b4");
                                Band("1 – 10", "#7fcdbb");
                                Band("10 – 100", "#41b6c4");
                                Band("100 – 1 000", "#2c7fb8");
                                Band("1 000 – 10 000", "#f97316");
                                Band("≥ 10 000", "#dc2626");
                            });
                        });

                        page.Footer().AlignCenter().Text(x =>
                        {
                            x.Span("Sugeneruota: ").FontSize(8).FontColor(Colors.Grey.Medium);
                            x.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm")).FontSize(8).FontColor(Colors.Grey.Medium);
                        });
                    });
                }
            }).GeneratePdf();
        }

        private static string EventTypeLabel(string? t) => t switch
        {
            "gaisras" => "Gaisras",
            "medžiagų išsiliejimas" => "Medžiagų išsiliejimas",
            "stichija" => "Stichija",
            _ => t ?? ""
        };

        private static string ComponentLabel(string? t) => t switch
        {
            "water" => "Vanduo",
            "soil" => "Žemė",
            "air" => "Oras",
            _ => t ?? ""
        };

        private static string SubstanceLabel(string? t) => t switch
        {
            "standard" => "Standartinis",
            "bds7" => "BDS₇",
            "suspended" => "Suspenduotos",
            _ => "–"
        };

        private static string StatusLabel(string? s) => s switch
        {
            "naujas" => "Naujas",
            "laukia peržiūros" => "Laukia peržiūros",
            "tikrinamas" => "Tikrinamas",
            "patvirtintas" => "Patvirtintas",
            "atmestas" => "Atmestas",
            _ => s ?? ""
        };
    }
}
