{{/*
Expand the name of the chart.
*/}}
{{- define "web.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "web.fullname" -}}
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
{{- define "web.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "web.labels" -}}
helm.sh/chart: {{ include "web.chart" . }}
{{ include "web.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ .Values.partOf | default "csbc-single-digital-gateway" }}
app.kubernetes.io/component: web
app.openshift.io/runtime: nginx
{{- end }}

{{/*
Selector labels
*/}}
{{- define "web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Get the configmap name
*/}}
{{- define "web.configMapName" -}}
{{- include "web.fullname" . }}
{{- end }}

{{/*
Get the image name
*/}}
{{- define "web.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion }}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.repository $tag }}
{{- end }}

{{/*
Validate required values
This template will fail the deployment if required values are not set
*/}}
{{- define "web.validateValues" -}}
{{- $errors := list -}}

{{/* Validate auth configuration */}}
{{- if not .Values.app.authUrl }}
{{- $errors = append $errors "app.authUrl is required. Please set the API auth URL." }}
{{- end }}

{{/* Validate API configuration */}}
{{- if not .Values.app.apiUri }}
{{- $errors = append $errors "app.apiUri is required. Please set the API URI." }}
{{- end }}

{{/* Output all errors */}}
{{- if $errors }}
{{- $errorMessage := "\n\nVALIDATION ERRORS - Required values are missing:\n" }}
{{- range $errors }}
{{- $errorMessage = printf "%s\n  - %s" $errorMessage . }}
{{- end }}
{{- $errorMessage = printf "%s\n\nPlease provide these values via:\n  - values file: -f values.dev.yaml\n  - command line: --set app.authUrl=https://api.example.com\n" $errorMessage }}
{{- fail $errorMessage }}
{{- end }}

{{- end }}
