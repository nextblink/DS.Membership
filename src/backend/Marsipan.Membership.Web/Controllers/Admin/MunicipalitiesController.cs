using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/municipalities")]
[Authorize(Policy = "ApiPolicy")]
public class MunicipalitiesController : ControllerBase
{
    private readonly IMunicipalitiesService _service;

    public MunicipalitiesController(IMunicipalitiesService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<MunicipalityTreeDto>>> GetTree()
    {
        var result = await _service.GetTreeAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MunicipalityDetailsDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<MunicipalityDetailsDto>> Create(CreateMunicipalityDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateMunicipalityDto dto)
    {
        await _service.UpdateAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
