def dockerImages = [
  [name: 'bimlab-asset-service', context: 'asset-service', dockerfile: 'Dockerfile'],
  [name: 'bimlab-asset-frontend', context: 'frontend', dockerfile: 'Dockerfile']
]

def normalizeTagPart(String value) {
  def sanitized = (value ?: 'local').toLowerCase().replaceAll(/[^a-z0-9_.-]/, '-')
  return sanitized.length() > 80 ? sanitized.substring(0, 80) : sanitized
}

def trimTrailingSlash(String value) {
  return (value ?: '').trim().replaceAll(/\/+$/, '')
}

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '20'))
    timeout(time: 75, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'RUN_SECURITY_AUDIT', defaultValue: false, description: 'Run dependency audit gates in addition to lint/test/build.')
    booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Push verified images. Requires REGISTRY_URL and REGISTRY_CREDENTIALS_ID.')
    string(name: 'REGISTRY_URL', defaultValue: '', description: 'Docker registry host, for example registry.example.com.')
    string(name: 'REGISTRY_NAMESPACE', defaultValue: 'bimlab', description: 'Registry namespace/project for pushed images.')
    string(name: 'REGISTRY_CREDENTIALS_ID', defaultValue: '', description: 'Jenkins username/password credential id for Docker registry.')
    choice(name: 'DEPLOY_TARGET', choices: ['none', 'test', 'production'], description: 'Optional guarded deploy target. Defaults to no deploy.')
    string(name: 'DEPLOY_HOST', defaultValue: '', description: 'Remote Docker host for deploy target.')
    string(name: 'DEPLOY_PATH', defaultValue: '', description: 'Remote directory containing docker-compose.yml.')
    string(name: 'DEPLOY_SSH_CREDENTIALS_ID', defaultValue: '', description: 'Jenkins SSH private key credential id for deploy.')
    string(name: 'HEALTHCHECK_URL', defaultValue: '', description: 'Optional URL checked after deploy.')
  }

  environment {
    APP_SLUG = 'qlvt'
    RUN_SECURITY_AUDIT = "${params.RUN_SECURITY_AUDIT ?: false}"
    MAVEN_IMAGE = 'maven:3.9.9-eclipse-temurin-17'
    NODE_IMAGE = 'node:22-alpine'
    DOCKER_BUILDKIT = '1'
    COMPOSE_DOCKER_CLI_BUILD = '1'
  }

  stages {
    stage('Prepare metadata') {
      steps {
        sh 'mkdir -p ci-artifacts .jenkins-cache/m2'
        script {
          env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
          env.GIT_SHA_SHORT = sh(returnStdout: true, script: 'git rev-parse --short=12 HEAD').trim()
          def branchPart = normalizeTagPart(env.BRANCH_NAME ?: 'local')
          def buildPart = normalizeTagPart(env.BUILD_NUMBER ?: '0')
          env.IMAGE_TAG = "${branchPart}-${buildPart}-${env.GIT_SHA_SHORT}"
          writeFile file: 'ci-artifacts/build-metadata.env', text: """APP_SLUG=${env.APP_SLUG}
GIT_SHA=${env.GIT_SHA}
GIT_SHA_SHORT=${env.GIT_SHA_SHORT}
IMAGE_TAG=${env.IMAGE_TAG}
BRANCH_NAME=${env.BRANCH_NAME ?: ''}
BUILD_NUMBER=${env.BUILD_NUMBER ?: ''}
"""
        }
      }
    }

    stage('Frontend: lint, test, build') {
      steps {
        dir('frontend') {
          sh '''
            set -eu
            mkdir -p reports
            docker run --rm \
              --user "$(id -u):$(id -g)" \
              --volumes-from "$HOSTNAME" \
              -w "$PWD" \
              -e CI=true \
              -e WORKSPACE="$WORKSPACE" \
              -e RUN_SECURITY_AUDIT="$RUN_SECURITY_AUDIT" \
              -e HOME=/tmp \
              -e NPM_CONFIG_CACHE=/tmp/npm \
              -e PNPM_HOME=/tmp/pnpm \
              -e PNPM_STORE_DIR=/tmp/pnpm-store \
              "$NODE_IMAGE" sh -lc '
                set -eu
                export PATH="$PNPM_HOME/bin:$PATH"
                if grep -Eq "lockfileVersion: .*6\\.0" pnpm-lock.yaml; then PNPM_VERSION=8.15.9; else PNPM_VERSION=10.33.2; fi
                mkdir -p "$PNPM_STORE_DIR"
                npm install -g "pnpm@$PNPM_VERSION" --prefix "$PNPM_HOME"
                pnpm config set store-dir "$PNPM_STORE_DIR"
                rm -rf node_modules
                pnpm install --frozen-lockfile
                rm -rf .pnpm-store
                pnpm lint
                pnpm test -- --reporter=default --reporter=junit --outputFile=reports/vitest-junit.xml
                pnpm build
                if [ "${RUN_SECURITY_AUDIT:-false}" = "true" ]; then pnpm audit --audit-level high; fi
              '
          '''
        }
      }
    }

    stage('Backend: verify and package (JDK 17)') {
      steps {
        sh '''
          set -eu
          docker run --rm \
            --user "$(id -u):$(id -g)" \
            -e HOME=/tmp \
            -e MAVEN_CONFIG=/tmp/.m2 \
            --volumes-from "$HOSTNAME" \
            -w "$PWD/asset-service" \
            "$MAVEN_IMAGE" mvn -Dmaven.repo.local="$PWD/.jenkins-cache/m2/repository" -ntp -B verify
        '''
      }
    }

    stage('Compose config validate') {
      steps {
        sh '''
          set -eu
          POSTGRES_USER=ci \
          POSTGRES_PASSWORD=ci \
          INTERNAL_API_KEY=ci \
          MINIO_ROOT_USER=ci \
          MINIO_ROOT_PASSWORD=ci \
          DB_PASSWORD=ci \
          docker compose config --quiet
        '''
      }
    }

    stage('Build and inspect Docker images') {
      steps {
        script {
          sh 'rm -f ci-artifacts/local-images.txt ci-artifacts/pushable-images.txt'
          dockerImages.each { image ->
            def localTag = "bimlab-ci/${image.name}:${env.IMAGE_TAG}"
            sh """
              set -eu
              docker build \\
                --label ci.repo=${env.APP_SLUG} \\
                --label org.opencontainers.image.revision=${env.GIT_SHA} \\
                -t "${localTag}" \\
                -f "${image.context}/${image.dockerfile}" \\
                "${image.context}"
              docker image inspect "${localTag}" >/dev/null
              printf '%s %s\\n' "${image.name}" "${localTag}" >> ci-artifacts/local-images.txt
              printf '%s %s\\n' "${image.name}" "${localTag}" >> ci-artifacts/pushable-images.txt
            """
          }
        }
      }
    }

    stage('Push images (armed)') {
      when {
        expression {
          return params.PUSH_IMAGES &&
            trimTrailingSlash(params.REGISTRY_URL ?: env.REGISTRY_URL).length() > 0 &&
            (params.REGISTRY_CREDENTIALS_ID ?: env.REGISTRY_CREDENTIALS_ID ?: '').trim().length() > 0
        }
      }
      steps {
        script {
          def registryUrl = trimTrailingSlash(params.REGISTRY_URL ?: env.REGISTRY_URL)
          def namespace = trimTrailingSlash(params.REGISTRY_NAMESPACE ?: 'bimlab')
          def credentialsId = (params.REGISTRY_CREDENTIALS_ID ?: env.REGISTRY_CREDENTIALS_ID).trim()
          withCredentials([usernamePassword(credentialsId: credentialsId, usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASSWORD')]) {
            withEnv(["TARGET_REGISTRY=${registryUrl}", "TARGET_NAMESPACE=${namespace}"]) {
              sh '''
                set -eu
                printf '%s' "$REGISTRY_PASSWORD" | docker login "$TARGET_REGISTRY" --username "$REGISTRY_USER" --password-stdin
                rm -f ci-artifacts/pushed-images.txt
                while read -r name local_tag; do
                  target="$TARGET_REGISTRY/$TARGET_NAMESPACE/$name:$IMAGE_TAG"
                  docker tag "$local_tag" "$target"
                  docker push "$target"
                  printf '%s %s\n' "$name" "$target" >> ci-artifacts/pushed-images.txt
                done < ci-artifacts/pushable-images.txt
              '''
            }
          }
        }
      }
    }

    stage('Production approval') {
      when {
        expression { return params.DEPLOY_TARGET == 'production' }
      }
      steps {
        input message: "Deploy QLVT ${env.IMAGE_TAG} to PRODUCTION?", ok: 'Deploy'
      }
    }

    stage('Deploy (armed)') {
      when {
        expression {
          def target = params.DEPLOY_TARGET ?: 'none'
          if (target == 'none') { return false }
          if (target == 'test' && env.BRANCH_NAME != 'test') { return false }
          if (target == 'production' && env.BRANCH_NAME != 'production') { return false }
          return params.PUSH_IMAGES &&
            params.DEPLOY_HOST?.trim() &&
            params.DEPLOY_PATH?.trim() &&
            params.DEPLOY_SSH_CREDENTIALS_ID?.trim()
        }
      }
      steps {
        script {
          def registryUrl = trimTrailingSlash(params.REGISTRY_URL ?: env.REGISTRY_URL)
          def namespace = trimTrailingSlash(params.REGISTRY_NAMESPACE ?: 'bimlab')
          withCredentials([sshUserPrivateKey(credentialsId: params.DEPLOY_SSH_CREDENTIALS_ID, keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
            withEnv([
              "TARGET_REGISTRY=${registryUrl}",
              "TARGET_NAMESPACE=${namespace}",
              "REMOTE_HOST=${params.DEPLOY_HOST.trim()}",
              "REMOTE_PATH=${params.DEPLOY_PATH.trim()}",
              "TARGET_ENV=${params.DEPLOY_TARGET}"
            ]) {
              sh '''
                set -eu
                remote="$SSH_USER@$REMOTE_HOST"
                ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$remote" \
                  "set -eu; cd '$REMOTE_PATH'; export DOCKER_REGISTRY='$TARGET_REGISTRY/$TARGET_NAMESPACE'; export BIMLAB_TAG='$IMAGE_TAG'; docker compose pull; docker compose up -d --remove-orphans"
                if [ -n "${HEALTHCHECK_URL:-}" ]; then
                  for attempt in $(seq 1 30); do
                    if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then exit 0; fi
                    sleep 5
                  done
                  echo "Healthcheck failed: $HEALTHCHECK_URL" >&2
                  exit 1
                fi
              '''
            }
          }
        }
      }
    }

    stage('Release readiness summary') {
      steps {
        script {
          def registryState = params.PUSH_IMAGES ? 'armed' : 'skipped'
          def deployState = params.DEPLOY_TARGET ?: 'none'
          echo "Phase 2.5 complete for ${env.APP_SLUG}: image tag ${env.IMAGE_TAG}, push=${registryState}, deploy=${deployState}."
        }
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'frontend/reports/**/*.xml,asset-service/target/surefire-reports/*.xml'
      archiveArtifacts allowEmptyArchive: true, fingerprint: true, artifacts: 'ci-artifacts/**,frontend/dist/**,asset-service/target/*.jar'
      sh 'docker logout "${REGISTRY_URL:-}" >/dev/null 2>&1 || true'
    }
    failure {
      echo 'QLVT Phase 2.5 pipeline failed; check the first failing quality gate above.'
    }
  }
}
