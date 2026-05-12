using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// CRUD for the <c>Function</c> lookup aggregate. Reads are open to any
/// authenticated user; writes are restricted to <c>SuperAdmin</c>.
/// </summary>
[ApiController]
[Route("api/functions")]
[Authorize(Policy = "ApiPolicy")]
public class FunctionsController : ControllerBase
{
    private readonly IFunctionsService _service;

    public FunctionsController(IFunctionsService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<FunctionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<FunctionDto>>> List(CancellationToken ct)
    {
        var items = await _service.ListAsync(ct);
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(FunctionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FunctionDto>> GetById(int id, CancellationToken ct)
    {
        var dto = await _service.GetByIdAsync(id, ct);
        if (dto is null)
            return NotFound();

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(FunctionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FunctionDto>> Create(
        [FromBody] CreateFunctionDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateFunctionDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var ok = await _service.UpdateAsync(id, dto, ct);
        if (!ok)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        // The service returns false in two cases: not found OR in use. Disambiguate.
        var existsBefore = await _service.GetByIdAsync(id, ct);
        if (existsBefore is null)
            return NotFound();

        var ok = await _service.SoftDeleteAsync(id, ct);
        if (!ok)
        {
            return Conflict(new
            {
                error = "FunctionInUse",
                message = "Cannot delete a function while it is assigned to one or more members.",
            });
        }

        return NoContent();
    }
}
