FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["VerdeCrop.API/VerdeCrop.API.csproj",                   "VerdeCrop.API/"]
COPY ["VerdeCrop.Application/VerdeCrop.Application.csproj",   "VerdeCrop.Application/"]
COPY ["VerdeCrop.Domain/VerdeCrop.Domain.csproj",             "VerdeCrop.Domain/"]
COPY ["VerdeCrop.Infrastructure/VerdeCrop.Infrastructure.csproj", "VerdeCrop.Infrastructure/"]
RUN dotnet restore "VerdeCrop.API/VerdeCrop.API.csproj"
COPY . .
RUN dotnet publish "VerdeCrop.API/VerdeCrop.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "VerdeCrop.API.dll"]
