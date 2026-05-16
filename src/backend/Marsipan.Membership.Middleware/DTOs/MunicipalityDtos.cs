namespace Marsipan.Membership.Middleware.DTOs;

public class MunicipalityDetailsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsCity { get; set; }
    public int? ParentId { get; set; }
}

public class CreateMunicipalityDto
{
    public string Name { get; set; } = null!;
    public bool IsCity { get; set; }
    public int? ParentId { get; set; }
}

public class UpdateMunicipalityDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsCity { get; set; }
    public int? ParentId { get; set; }
}

public class MunicipalityTreeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsCity { get; set; }
    public int? ParentId { get; set; }
    public List<MunicipalityTreeDto> Children { get; set; } = [];
}
