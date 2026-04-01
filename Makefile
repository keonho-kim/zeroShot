# Makefile
#
# 사용자는 make build 또는 make update만 실행하면 됩니다.
# 실제 전체 오케스트레이션은 scripts/build.sh가 담당합니다.

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := build
.EXPORT_ALL_VARIABLES:

APPROVAL ?= never
SANDBOX ?= workspace-write
MAX_ITERS ?= 30
STALL_LIMIT ?= 2

PLAN_REASONING ?= high
EXEC_REASONING ?= medium
VALIDATE_REASONING ?= medium
CLOSEOUT_REASONING ?= medium

.PHONY: build update

build:
	@echo "[make] build 타깃을 시작합니다."
	@echo "[make] PRODUCT.md를 기준으로 새 run을 생성합니다."
	@MODE=build bash scripts/build.sh

update:
	@echo "[make] update 타깃을 시작합니다."
	@echo "[make] PRODUCT.md + UPDATE.md + 이전 run을 비교하여 새 update run을 생성합니다."
	@MODE=update bash scripts/build.sh
