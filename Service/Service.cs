using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using ŽVPAIS_API.Repositories;
using ŽVPAIS_API.Models;

namespace ŽVPAIS_API.Services
{
    public interface IEventService
    {
        Task<IEnumerable<EventResponseDto>> GetAllEventsAsync();
        Task<EventResponseDto?> GetEventByIdAsync(int id);
        Task<EventResponseDto> CreateEventAsync(EventCreateDto dto);
        Task UpdateEventAsync(int id, EventCreateDto dto);
        Task DeleteEventAsync(int id);
        Task<decimal> GetEventDamageAsync(int eventId);
    }

    public class EventService : IEventService
    {
        private readonly IEventRepository _repository;
        private readonly IDamageCalculationService _damageCalculationService;
        private readonly string[] _allowedEventTypes = ["gaisras", "medžiagų išsiliejimas", "stichija"];
        private readonly GeoJsonReader _geoJsonReader = new();
        private readonly GeoJsonWriter _geoJsonWriter = new();

        public EventService(IEventRepository repository, IDamageCalculationService damageCalculationService)
        {
            _repository = repository;
            _damageCalculationService = damageCalculationService;
        }

        public async Task<IEnumerable<EventResponseDto>> GetAllEventsAsync()
        {
            var events = await _repository.GetAllAsync();
            return events.Select(MapToDto);
        }

        public async Task<EventResponseDto?> GetEventByIdAsync(int id)
        {
            var @event = await _repository.GetByIdAsync(id);
            return @event == null ? null : MapToDto(@event);
        }

        public async Task<EventResponseDto> CreateEventAsync(EventCreateDto dto)
        {
            ValidateEventType(dto.EventType);
            var polygon = ParsePolygon(dto.Polygon);

            var @event = new Event
            {
                EventType = dto.EventType,
                EventDate = dto.EventDate.ToUniversalTime(),
                Description = dto.Description,
                Location = dto.Location,
                Coordinates = polygon,
                Status = "naujas"
            };

            var created = await _repository.AddAsync(@event);

            var eventObjects = dto.EventObjects ?? [];
            if (eventObjects.Count != 0)
                await _repository.SetEventObjectsAsync(created.IdEvent, eventObjects);

            var result = await _repository.GetByIdAsync(created.IdEvent);
            return MapToDto(result!);
        }

        public async Task UpdateEventAsync(int id, EventCreateDto dto)
        {
            var @event = await _repository.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("Įvykis nerastas.");

            ValidateEventType(dto.EventType);
            var polygon = ParsePolygon(dto.Polygon);

            @event.EventType = dto.EventType;
            @event.EventDate = dto.EventDate.ToUniversalTime();
            @event.Description = dto.Description;
            @event.Location = dto.Location;
            @event.Coordinates = polygon;

            await _repository.UpdateAsync(@event);

            var eventObjects = dto.EventObjects ?? [];
            await _repository.SetEventObjectsAsync(id, eventObjects);
        }

        public async Task DeleteEventAsync(int id)
        {
            await _repository.DeleteAsync(id);
        }

        public async Task<decimal> GetEventDamageAsync(int eventId)
        {
            return await _damageCalculationService.CalculateDamageForEvent(eventId);
        }

        private void ValidateEventType(string eventType)
        {
            if (!_allowedEventTypes.Contains(eventType))
                throw new ArgumentException($"Neteisingas tipas: {eventType}");
        }

        private Polygon ParsePolygon(string geoJson)
        {
            try
            {
                var geometry = _geoJsonReader.Read<Geometry>(geoJson);
                return geometry as Polygon
                    ?? throw new ArgumentException("GeoJSON turi būti poligonas.");
            }
            catch (ArgumentException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new ArgumentException($"Neteisingas GeoJSON formatas: {ex.Message}");
            }
        }

        private EventResponseDto MapToDto(Event @event)
        {
            return new EventResponseDto
            {
                IdEvent = @event.IdEvent,
                EventType = @event.EventType,
                EventDate = @event.EventDate,
                Description = @event.Description,
                Location = @event.Location,
                Polygon = _geoJsonWriter.Write(@event.Coordinates),
                CentroidLat = @event.Coordinates?.Centroid?.Y,
                CentroidLon = @event.Coordinates?.Centroid?.X,
                Status = @event.Status,
                CreatedAt = @event.CreatedAt,
                UpdatedAt = @event.UpdatedAt,
                Objects = @event.EventObjects?.Select(eo => new EventObjectResponseDto
                {
                    IdObject = eo.Object.IdObject,
                    Name = eo.Object.Name,
                    Description = eo.Object.Description,
                    ComponentType = eo.ComponentType,
                    KKat = eo.KKat
                }).ToList() ?? []
            };
        }
    }
}
