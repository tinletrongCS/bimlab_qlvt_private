FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
# Bound Maven JVM heap and disable C2 compiler tier to avoid SIGSEGV / OOM
# on small CI builders. Matches task-service / project-service Dockerfile.
ENV MAVEN_OPTS="-Xmx512m -XX:TieredStopAtLevel=1 -XX:-UsePerfData"
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN chown appuser:appuser app.jar
USER appuser
EXPOSE 8086
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -sf http://localhost:8086/actuator/health || exit 1
ENTRYPOINT ["java","-XX:+UseContainerSupport","-XX:MaxRAMPercentage=75.0","-jar","app.jar"]