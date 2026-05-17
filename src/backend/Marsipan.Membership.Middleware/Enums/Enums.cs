namespace Marsipan.Membership.Middleware.Enums;

public enum Gender
{
    Male,
    Female
}

public enum MaritalStatus
{
    Single,
    Married,
    Divorced,
    Widowed
}

public enum EducationLevel
{
    Primary,
    Secondary,
    Higher,
    University,
    Masters,
    Doctorate
}

public enum PhoneType
{
    Mobile,
    Landline,
    Business
}

public enum CommitteeType
{
    City               = 0,   // ГРО
    Municipal          = 1,   // ОО
    MainCommittee      = 2,   // Главни одбор
    ExecutiveCommittee = 3,   // Извршни одбор
    Presidency         = 4,   // Председништво
}

public enum FormStatus
{
    Pending,
    Verified,
    Rejected
}
