using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// Members aggregate API — list, CRUD, and nested phones + functions.
/// All endpoints require JWT authentication via the <c>ApiPolicy</c>;
/// row-level scoping is centralised in <see cref="IMembersService"/>
/// via <see cref="ScopeFilters.ApplyMemberScope"/>.
/// </summary>
[ApiController]
[Route("api/members")]
[Authorize(Policy = "ApiPolicy")]
public class MembersController : ControllerBase
{
    private readonly IMembersService _members;

    public MembersController(IMembersService members)
    {
        _members = members;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<MemberListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResultDto<MemberListItemDto>>> List(
        [FromQuery] MemberQuery query,
        CancellationToken ct)
    {
        var result = await _members.SearchAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(MemberDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MemberDetailsDto>> GetById(int id, CancellationToken ct)
    {
        var member = await _members.GetByIdAsync(id, ct);
        return member is null ? NotFound() : Ok(member);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MemberDetailsDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MemberDetailsDto>> Create(
        [FromBody] CreateMemberDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var created = await _members.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateMemberDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var ok = await _members.UpdateAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _members.SoftDeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    // ----- Nested: phones -----

    [HttpPost("{id:int}/phones")]
    [ProducesResponseType(typeof(PhoneDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PhoneDto>> AddPhone(
        int id,
        [FromBody] AddPhoneDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var phone = await _members.AddPhoneAsync(id, dto, ct);
        if (phone is null)
            return NotFound();

        return CreatedAtAction(nameof(GetById), new { id }, phone);
    }

    [HttpDelete("{memberId:int}/phones/{phoneId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemovePhone(int memberId, int phoneId, CancellationToken ct)
    {
        var ok = await _members.RemovePhoneAsync(memberId, phoneId, ct);
        return ok ? NoContent() : NotFound();
    }

    // ----- Nested: functions -----

    [HttpGet("{id:int}/functions")]
    [ProducesResponseType(typeof(List<MemberFunctionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<MemberFunctionDto>>> ListFunctions(int id, CancellationToken ct)
    {
        var list = await _members.ListFunctionsAsync(id, ct);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpPost("{id:int}/functions")]
    [ProducesResponseType(typeof(MemberFunctionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MemberFunctionDto>> AddFunction(
        int id,
        [FromBody] AddMemberFunctionDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var mf = await _members.AddFunctionAsync(id, dto, ct);
        if (mf is null)
            return NotFound();

        return CreatedAtAction(nameof(GetById), new { id }, mf);
    }

    [HttpDelete("{memberId:int}/functions/{mfId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFunction(int memberId, int mfId, CancellationToken ct)
    {
        var ok = await _members.RemoveFunctionAsync(memberId, mfId, ct);
        return ok ? NoContent() : NotFound();
    }
}
