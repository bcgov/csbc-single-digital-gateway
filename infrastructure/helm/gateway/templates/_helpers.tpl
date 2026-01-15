{{/*
Expand the name of the chart.
*/}}
{{- define "gateway.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "gateway.fullname" -}}
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
{{- define "gateway.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "gateway.labels" -}}
helm.sh/chart: {{ include "gateway.chart" . }}
{{ include "gateway.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ .Values.partOf | default "csbc-single-digital-gateway" }}
app.kubernetes.io/component: gateway
app.openshift.io/runtime: nginx
{{- end }}

{{/*
Selector labels
*/}}
{{- define "gateway.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gateway.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Get the configmap name
*/}}
{{- define "gateway.configMapName" -}}
{{- include "gateway.fullname" . }}
{{- end }}

{{/*
Get the image name
*/}}
{{- define "gateway.image" -}}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.repository .Values.image.tag }}
{{- end }}

{{/*
Validate required values
*/}}
{{- define "gateway.validateValues" -}}
{{- $errors := list -}}

{{/* Validate web service configuration */}}
{{- if not .Values.services.web.name }}
{{- $errors = append $errors "services.web.name is required. This should be the name of the web service (e.g., myrelease-web)." }}
{{- end }}

{{/* Validate API service configuration */}}
{{- if not .Values.services.api.name }}
{{- $errors = append $errors "services.api.name is required. This should be the name of the API service (e.g., myrelease-api)." }}
{{- end }}

{{/* Output all errors */}}
{{- if $errors }}
{{- $errorMessage := "\n\nVALIDATION ERRORS - Required values are missing:\n" }}
{{- range $errors }}
{{- $errorMessage = printf "%s\n  ❌ %s" $errorMessage . }}
{{- end }}
{{- $errorMessage = printf "%s\n\nPlease provide these values via:\n  - values file: -f values.dev.yaml\n  - command line: --set services.web.name=myrelease-web --set services.api.name=myrelease-api\n" $errorMessage }}
{{- fail $errorMessage }}
{{- end }}

{{- end }}
