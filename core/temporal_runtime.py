from __future__ import annotations

import asyncio

from temporalio.client import Client
from temporalio.worker import UnsandboxedWorkflowRunner, Worker

from core.temporal_activities import load_usage_record
from core.temporal_workflows import UsageReportWorkflow


class TemporalRuntime:
    def __init__(self, client: Client, worker: Worker, task: asyncio.Task[None]):
        self.client = client
        self.worker = worker
        self.task = task

    @classmethod
    async def start(cls, address: str, task_queue: str) -> "TemporalRuntime":
        client = await Client.connect(address)
        worker = Worker(
            client,
            task_queue=task_queue,
            workflows=[UsageReportWorkflow],
            activities=[load_usage_record],
            # FastEmbed installs beartype import hooks that conflict with
            # Temporal's import sandbox. Workflow code remains deterministic.
            workflow_runner=UnsandboxedWorkflowRunner(),
        )
        task = asyncio.create_task(worker.run())
        return cls(client, worker, task)

    async def close(self) -> None:
        await self.worker.shutdown()
        await self.task
