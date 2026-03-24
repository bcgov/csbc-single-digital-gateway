{{/*
Expand the name of the chart.
*/}}
{{- define "api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "api.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "api.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "api.labels" -}}
helm.sh/chart: {{ include "api.chart" . }}
{{ include "api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ .Values.partOf | default "csbc-single-digital-gateway" }}
app.kubernetes.io/component: api
app.openshift.io/runtime: nodejs
{{- if .Values.nodeVersion }}
app.openshift.io/runtime-version: {{ .Values.nodeVersion | quote }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "api.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "api.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Get the configmap name
*/}}
{{- define "api.configMapName" -}}
{{- include "api.fullname" . }}
{{- end }}

{{/*
Get the image name
*/}}
{{- define "api.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion }}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.repository $tag }}
{{- end }}

{{/*
Get the migrations image name
*/}}
{{- define "api.migrationsImage" -}}
{{- $tag := .Values.migrations.image.tag | default .Values.image.tag | default .Chart.AppVersion }}
{{- printf "%s/%s:%s" .Values.image.registry .Values.migrations.image.repository $tag }}
{{- end }}

{{/*
Validate required values
This template will fail the deployment if required values are not set
*/}}
{{- define "api.validateValues" -}}
{{- $errors := list -}}

{{/* Validate database configuration */}}
{{- if not .Values.app.database.secretName }}
{{- $errors = append $errors "app.database.secretName is required. This should reference the secret created by the database chart (e.g., csbc-single-digital-gateway-postgres-pguser-postgres)." }}
{{- end }}

{{/* Validate BCSC OIDC configuration */}}
{{- if not .Values.app.oidc.issuer }}
{{- $errors = append $errors "app.oidc.issuer is required. Please set the BCSC OIDC issuer URL." }}
{{- end }}

{{- if not .Values.app.oidc.clientId }}
{{- $errors = append $errors "app.oidc.clientId is required. Please set the BCSC OIDC client ID." }}
{{- end }}

{{- if not .Values.app.oidc.clientSecret }}
{{- $errors = append $errors "app.oidc.clientSecret is required. Please set the BCSC OIDC client secret." }}
{{- end }}

{{- if not .Values.app.oidc.redirectUri }}
{{- $errors = append $errors "app.oidc.redirectUri is required. Please set the BCSC OIDC redirect URI." }}
{{- end }}

{{- if not .Values.app.oidc.postLogoutRedirectUri }}
{{- $errors = append $errors "app.oidc.postLogoutRedirectUri is required. Please set the BCSC OIDC post-logout redirect URI." }}
{{- end }}

{{/* Validate IDIR OIDC configuration */}}
{{- if not .Values.app.authOidc.issuer }}
{{- $errors = append $errors "app.authOidc.issuer is required. Please set the IDIR OIDC issuer URL." }}
{{- end }}

{{- if not .Values.app.authOidc.clientId }}
{{- $errors = append $errors "app.authOidc.clientId is required. Please set the IDIR OIDC client ID." }}
{{- end }}

{{- if not .Values.app.authOidc.clientSecret }}
{{- $errors = append $errors "app.authOidc.clientSecret is required. Please set the IDIR OIDC client secret." }}
{{- end }}

{{- if not .Values.app.authOidc.redirectUri }}
{{- $errors = append $errors "app.authOidc.redirectUri is required. Please set the IDIR OIDC redirect URI." }}
{{- end }}

{{- if not .Values.app.authOidc.postLogoutRedirectUri }}
{{- $errors = append $errors "app.authOidc.postLogoutRedirectUri is required. Please set the IDIR OIDC post-logout redirect URI." }}
{{- end }}

{{- if not .Values.app.session.secret }}
{{- $errors = append $errors "app.session.secret is required. Please set the session secret." }}
{{- end }}

{{- if not .Values.app.frontendUrl }}
{{- $errors = append $errors "app.frontendUrl is required. Please set the frontend URL." }}
{{- end }}

{{- if not .Values.app.adminFrontendUrl }}
{{- $errors = append $errors "app.adminFrontendUrl is required. Please set the admin frontend URL." }}
{{- end }}

{{/* Output all errors */}}
{{- if $errors }}
{{- $errorMessage := "\n\nVALIDATION ERRORS - Required values are missing:\n" }}
{{- range $errors }}
{{- $errorMessage = printf "%s\n  ❌ %s" $errorMessage . }}
{{- end }}
{{- $errorMessage = printf "%s\n\nPlease provide these values via:\n  - values file: -f values.dev.yaml\n  - command line: --set app.oidc.issuer=https://example.com --set app.authOidc.issuer=https://example.com\n" $errorMessage }}
{{- fail $errorMessage }}
{{- end }}

{{- end }}
