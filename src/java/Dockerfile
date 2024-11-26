FROM eclipse-temurin:23-jdk

ARG APP_DIR=/APP

WORKDIR ${APP_DIR}

COPY pom.xml .
COPY mvnw .
COPY mvnw.cmd .
COPY src src
COPY .mvn .mvn

RUN ./mvnw package -Dmaven.test.skip=true

ENV SERVER_PORT=3000 METRICS_PORT=3100 INSTANCE_NAME="dov bear" INSTANCE_HASH="abc123"

EXPOSE ${SERVER_PORT} ${METRICS_PORT}

ENTRYPOINT java -jar target/dovbear-0.0.1-SNAPSHOT.jar