// src/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const created = await prisma.task.create({ data: { ...data } });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "create failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    if (!data?.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const updated = await prisma.task.update({
      where: { id: data.id },
      data: { ...data },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "update failed" }, { status: 400 });
  }
}
