using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// OrgUnit endpoints — tree retrieval plus SuperAdmin-only CRUD.
/// </summary>
[ApiController]
[Route("api/orgunits")]
[Authorize(Policy = "ApiPolicy")]
public class OrgUnitsController : ControllerBase
{
    private readonly IOrgUnitsService _service;

    public OrgUnitsController(IOrgUnitsService service)
    {
        _service = service;
    }

    /// <summary>Tree of all non-deleted OrgUnits. Any authenticated role.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<OrgUnitTreeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<OrgUnitTreeDto>>> GetTree(CancellationToken ct)
    {
        var tree = await _service.GetTreeAsync(ct);
        return Ok(tree);
    }

    /// <summary>Single OrgUnit by id. Any authenticated role.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(OrgUnitDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrgUnitDetailsDto>> GetById(int id, CancellationToken ct)
    {
        var dto = await _service.GetByIdAsync(id, ct);
        if (dto is null)
            return NotFound();

        return Ok(dto);
    }

    /// <summary>Create a new OrgUnit. SuperAdmin only.</summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(OrgUnitDetailsDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrgUnitDetailsDto>> Create(
        [FromBody] CreateOrgUnitDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Update an OrgUnit. SuperAdmin only.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateOrgUnitDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var ok = await _service.UpdateAsync(id, dto, ct);
        if (!ok)
            return NotFound();

        return NoContent();
    }

    /// <summary>
    /// Soft-delete an OrgUnit. SuperAdmin only.
    /// Returns 409 Conflict if the unit still has non-deleted children
    /// (the service refuses to cascade — reparent or delete children first).
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        // Distinguish not-found (404) from refuse-on-children (409) by
        // checking existence first so the API contract stays unambiguous.
        var existing = await _service.GetByIdAsync(id, ct);
        if (existing is null)
            return NotFound();

        var ok = await _service.SoftDeleteAsync(id, ct);
        if (!ok)
        {
            return Conflict(new
            {
                error = "OrgUnit has non-deleted children. Reparent or delete them first.",
            });
        }

        return NoContent();
    }
}
