import { useState, useEffect, useRef } from "react";
import {
  type ZoneSize,
  ZONE_SIZE_PRESETS,
  getZoneDimensions,
} from "../lib/zoneSize";
import { useStageLayout } from "../../hooks/useStageLayout";
import { createId } from "../../lib/supabase";
import type { ZoneType, Zone, BoxPosition } from "../../lib/db/mappers";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Trash2, Plus, Minus, X, Check, Box as BoxIcon, Edit2, AlertCircle, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { useApp } from "../context/AppContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { cn } from "../components/ui/utils";
import {
  StageMapViewportProvider,
  StageMapCanvasScrollArea,
} from "../components/StageMapCanvasViewport";
import { useStageMapViewport } from "../context/StageMapViewportContext";
import {
  clientToCanvasPosition,
  clampCanvasPosition,
  getCanvasLogicalSize,
  getStageMapCanvas,
} from "../lib/stageMapCanvasCoords";

const defaultZoneTypes: ZoneType[] = [
  { id: "stage", label: "무대", color: "bg-purple-100 border-purple-400 text-purple-800" },
  { id: "seats", label: "객석", color: "bg-blue-100 border-blue-400 text-blue-800" },
  { id: "soundbooth", label: "사운드부스", color: "bg-green-100 border-green-400 text-green-800" },
  { id: "entrance", label: "출입구", color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  { id: "restroom", label: "화장실", color: "bg-gray-100 border-gray-400 text-gray-800" },
];

const colorOptions = [
  { value: "purple", class: "bg-purple-100 border-purple-400 text-purple-800" },
  { value: "blue", class: "bg-blue-100 border-blue-400 text-blue-800" },
  { value: "green", class: "bg-green-100 border-green-400 text-green-800" },
  { value: "yellow", class: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  { value: "gray", class: "bg-gray-100 border-gray-400 text-gray-800" },
  { value: "red", class: "bg-red-100 border-red-400 text-red-800" },
  { value: "orange", class: "bg-orange-100 border-orange-400 text-orange-800" },
];

const BOX_WIDTH = 100;
const BOX_HEIGHT = 80;
const DRAG_THRESHOLD = 5;

function StageMapZoomButtons() {
  const { zoomIn, zoomOut } = useStageMapViewport();

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 min-h-0 min-w-0"
        onClick={zoomIn}
        aria-label="확대"
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 min-h-0 min-w-0"
        onClick={zoomOut}
        aria-label="축소"
      >
        <Minus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

const ZONE_SIZE_CYCLE: Record<ZoneSize, ZoneSize> = { s: "m", m: "l", l: "s" };

function zoneTypeBgClass(colorClass: string) {
  return colorClass.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-gray-100";
}

function SegmentedSizeControl({
  value,
  onChange,
  className,
  disabled = false,
}: {
  value: ZoneSize;
  onChange: (size: ZoneSize) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn("inline-flex p-0.5 rounded-lg bg-gray-100", className)}
      role="group"
      aria-label="아이콘 크기"
    >
      {(["s", "m", "l"] as const).map((size) => (
        <button
          key={size}
          type="button"
          className={cn(
            "min-w-[2.25rem] px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            value === size
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          onClick={() => onChange(size)}
          disabled={disabled}
        >
          {ZONE_SIZE_PRESETS[size].label}
        </button>
      ))}
    </div>
  );
}

function DraggableZone({
  zone,
  zoneType,
  width,
  height,
  editable,
  onMove,
  onMoveEnd,
  onDelete,
  onResize,
}: {
  zone: Zone;
  zoneType: ZoneType;
  width: number;
  height: number;
  editable: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onMoveEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onResize: (id: string, size: ZoneSize) => void;
}) {
  const { scale } = useStageMapViewport();
  const [isDragging, setIsDragging] = useState(false);
  const dragDataRef = useRef<{
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    dragDataRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };

    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!editable) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length > 1) return;

    const touch = e.touches[0];
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    dragDataRef.current = {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      startX: touch.clientX,
      startY: touch.clientY,
      hasMoved: false,
    };

    setIsDragging(true);
    e.stopPropagation();
  };

  const resolvePosition = (clientX: number, clientY: number) => {
    if (!dragDataRef.current) return null;
    const raw = clientToCanvasPosition(
      clientX,
      clientY,
      scale,
      dragDataRef.current.offsetX,
      dragDataRef.current.offsetY
    );
    return clampCanvasPosition(raw.x, raw.y, width, height);
  };

  useEffect(() => {
    if (!isDragging || !dragDataRef.current) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!dragDataRef.current) return;

      const deltaX = Math.abs(clientX - dragDataRef.current.startX);
      const deltaY = Math.abs(clientY - dragDataRef.current.startY);

      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        dragDataRef.current.hasMoved = true;
      }

      if (!dragDataRef.current.hasMoved) return;

      const pos = resolvePosition(clientX, clientY);
      if (pos) onMove(zone.id, pos.x, pos.y);
    };

    const lastPos = { x: zone.x, y: zone.y };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
      if (dragDataRef.current?.hasMoved) {
        const pos = resolvePosition(e.clientX, e.clientY);
        if (pos) {
          lastPos.x = pos.x;
          lastPos.y = pos.y;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      handlePointerMove(touch.clientX, touch.clientY);
      if (dragDataRef.current?.hasMoved) {
        const pos = resolvePosition(touch.clientX, touch.clientY);
        if (pos) {
          lastPos.x = pos.x;
          lastPos.y = pos.y;
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (dragDataRef.current?.hasMoved) {
        onMoveEnd(zone.id, lastPos.x, lastPos.y);
      }
      setIsDragging(false);
      dragDataRef.current = null;
    };

    const handleTouchEnd = () => {
      if (dragDataRef.current?.hasMoved) {
        onMoveEnd(zone.id, lastPos.x, lastPos.y);
      }
      setIsDragging(false);
      dragDataRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, zone.id, zone.x, zone.y, onMove, onMoveEnd, width, height, scale]);

  return (
    <div
      data-stage-map-item
      style={{
        position: "absolute",
        left: zone.x,
        top: zone.y,
        width,
        height,
        opacity: isDragging ? 0.7 : 1,
        cursor: editable ? (isDragging ? "grabbing" : "grab") : "default",
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className={`${zoneType.color} border-2 rounded-lg shadow-md relative w-full h-full`}>
        {editable && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 z-10 min-w-[30px] min-h-[30px] w-[30px] h-[30px] bg-red-500 hover:bg-red-600 text-white rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(zone.id);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        <p className="font-medium text-center px-2 h-full flex items-center justify-center text-sm break-keep pb-5">
          {zoneType.label}
        </p>
        {editable && (
          <button
            type="button"
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 h-6 min-w-[1.75rem] px-2 rounded-full bg-white/95 border border-gray-200 text-[10px] font-bold text-gray-700 shadow-sm"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onResize(zone.id, ZONE_SIZE_CYCLE[zone.size]);
            }}
            aria-label={`크기 ${zone.size.toUpperCase()}, 탭하여 변경`}
          >
            {ZONE_SIZE_PRESETS[zone.size].label}
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableBox({
  boxPosition,
  box,
  editable,
  onMove,
  onMoveEnd,
  onDelete,
  onClick
}: {
  boxPosition: BoxPosition;
  box: any;
  editable: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onMoveEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const { scale } = useStageMapViewport();
  const [isDragging, setIsDragging] = useState(false);
  const dragDataRef = useRef<{
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    dragDataRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };

    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!editable) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length > 1) return;

    const touch = e.touches[0];
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    dragDataRef.current = {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      startX: touch.clientX,
      startY: touch.clientY,
      hasMoved: false,
    };

    setIsDragging(true);
    e.stopPropagation();
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!editable) {
      onClick();
      return;
    }

    if (dragDataRef.current && !dragDataRef.current.hasMoved) {
      onClick();
    }
  };

  const resolvePosition = (clientX: number, clientY: number) => {
    if (!dragDataRef.current) return null;
    const raw = clientToCanvasPosition(
      clientX,
      clientY,
      scale,
      dragDataRef.current.offsetX,
      dragDataRef.current.offsetY
    );
    return clampCanvasPosition(raw.x, raw.y, BOX_WIDTH, BOX_HEIGHT);
  };

  useEffect(() => {
    if (!isDragging || !dragDataRef.current) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!dragDataRef.current) return;

      const deltaX = Math.abs(clientX - dragDataRef.current.startX);
      const deltaY = Math.abs(clientY - dragDataRef.current.startY);

      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        dragDataRef.current.hasMoved = true;
      }

      if (!dragDataRef.current.hasMoved) return;

      const pos = resolvePosition(clientX, clientY);
      if (pos) onMove(boxPosition.id, pos.x, pos.y);
    };

    const lastPos = { x: boxPosition.x, y: boxPosition.y };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
      if (dragDataRef.current?.hasMoved) {
        const pos = resolvePosition(e.clientX, e.clientY);
        if (pos) {
          lastPos.x = pos.x;
          lastPos.y = pos.y;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      handlePointerMove(touch.clientX, touch.clientY);
      if (dragDataRef.current?.hasMoved) {
        const pos = resolvePosition(touch.clientX, touch.clientY);
        if (pos) {
          lastPos.x = pos.x;
          lastPos.y = pos.y;
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (dragDataRef.current?.hasMoved) {
        onMoveEnd(boxPosition.id, lastPos.x, lastPos.y);
      }
      setIsDragging(false);
      setTimeout(() => {
        dragDataRef.current = null;
      }, 0);
    };

    const handleTouchEnd = () => {
      if (dragDataRef.current?.hasMoved) {
        onMoveEnd(boxPosition.id, lastPos.x, lastPos.y);
      }
      setIsDragging(false);
      setTimeout(() => {
        dragDataRef.current = null;
      }, 0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, boxPosition.id, boxPosition.x, boxPosition.y, onMove, onMoveEnd, scale]);

  return (
    <div
      data-stage-map-item
      style={{
        position: "absolute",
        left: boxPosition.x,
        top: boxPosition.y,
        opacity: isDragging ? 0.7 : 1,
        cursor: editable ? (isDragging ? "grabbing" : "grab") : "pointer",
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center" style={{ width: BOX_WIDTH }}>
        <div className="bg-orange-100 border-2 border-orange-400 p-3 rounded-lg shadow-md relative">
          <BoxIcon className="w-8 h-8 text-orange-700" />
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 z-10 min-w-[30px] min-h-[30px] w-[30px] h-[30px] bg-red-500 hover:bg-red-600 text-white rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(boxPosition.id);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs mt-1 font-medium text-center max-w-[100px] truncate">{box?.name || "박스"}</p>
      </div>
    </div>
  );
}

function ZoneElementsList({
  isEditMode,
  zoneTypes,
  zones,
  editingZoneTypeId,
  editingZoneName,
  newZoneSize,
  isAddZoneDialogOpen,
  newZoneName,
  newZoneColor,
  onNewZoneSizeChange,
  onEditingZoneNameChange,
  onStartEditZoneType,
  onSaveZoneTypeName,
  onCancelEditZoneType,
  onAddZone,
  onSetDeleteConfirmZoneTypeId,
  onSetIsAddZoneDialogOpen,
  onNewZoneNameChange,
  onNewZoneColorChange,
  onAddCustomZoneType,
}: {
  isEditMode: boolean;
  zoneTypes: ZoneType[];
  zones: Zone[];
  editingZoneTypeId: string | null;
  editingZoneName: string;
  newZoneSize: ZoneSize;
  isAddZoneDialogOpen: boolean;
  newZoneName: string;
  newZoneColor: string;
  onNewZoneSizeChange: (size: ZoneSize) => void;
  onEditingZoneNameChange: (name: string) => void;
  onStartEditZoneType: (zoneType: ZoneType) => void;
  onSaveZoneTypeName: () => void;
  onCancelEditZoneType: () => void;
  onAddZone: (zoneTypeId: string) => void;
  onSetDeleteConfirmZoneTypeId: (id: string) => void;
  onSetIsAddZoneDialogOpen: (open: boolean) => void;
  onNewZoneNameChange: (name: string) => void;
  onNewZoneColorChange: (color: string) => void;
  onAddCustomZoneType: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 break-keep leading-snug">
          크기 선택 후 <span className="font-medium text-gray-700">+</span> 로 맵에 추가
        </p>
        <SegmentedSizeControl
          value={newZoneSize}
          onChange={onNewZoneSizeChange}
          disabled={!isEditMode}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
        {zoneTypes.map((zoneType) => {
          const countOnMap = zones.filter((z) => z.zoneTypeId === zoneType.id).length;
          return (
            <div key={zoneType.id} className="px-3 py-2.5">
              {editingZoneTypeId === zoneType.id ? (
                <Input
                  value={editingZoneName}
                  onChange={(e) => onEditingZoneNameChange(e.target.value)}
                  onBlur={onSaveZoneTypeName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveZoneTypeName();
                    if (e.key === "Escape") onCancelEditZoneType();
                  }}
                  autoFocus
                  className="min-h-[40px]"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn("w-2 h-8 rounded-full shrink-0", zoneTypeBgClass(zoneType.color))}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-keep truncate">
                      {zoneType.label}
                    </p>
                    {countOnMap > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">맵에 {countOnMap}개</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => onAddZone(zoneType.id)}
                    aria-label={`${zoneType.label} 맵에 추가`}
                    disabled={!isEditMode}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-gray-500"
                        aria-label={`${zoneType.label} 더보기`}
                        disabled={!isEditMode}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => onStartEditZoneType(zoneType)}>
                        <Edit2 className="w-4 h-4" />
                        이름 수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onSetDeleteConfirmZoneTypeId(zoneType.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog
        open={isAddZoneDialogOpen}
        onOpenChange={(open) => onSetIsAddZoneDialogOpen(isEditMode && open)}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full min-h-[44px] border-dashed text-gray-600 hover:text-gray-900 hover:border-gray-400"
            disabled={!isEditMode}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="break-keep">새 구역 종류</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>새 구역 종류 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>구역 이름</Label>
              <Input
                value={newZoneName}
                onChange={(e) => onNewZoneNameChange(e.target.value)}
                placeholder="예: VIP 구역, 대기실 등"
                className="min-h-[44px]"
              />
            </div>
            <div>
              <Label>색상 선택</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-10 rounded border-2 ${
                      newZoneColor === color.value ? "border-black" : "border-gray-300"
                    } ${color.class}`}
                    onClick={() => onNewZoneColorChange(color.value)}
                    disabled={!isEditMode}
                  />
                ))}
              </div>
            </div>
            <Button onClick={onAddCustomZoneType} className="w-full min-h-[44px]" disabled={!isEditMode}>
              추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoxPlacementList({
  boxes,
  isBoxPlaced,
  isEditMode,
  onAddBox,
}: {
  boxes: { id: string; name: string; location: string }[];
  isBoxPlaced: (id: string) => boolean;
  isEditMode: boolean;
  onAddBox: (id: string) => void;
}) {
  if (boxes.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6 break-keep">
        박스 관리에서 박스를 먼저 등록하세요
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 break-keep">
        <span className="font-medium text-gray-700">+</span> 로 맵에 올리기
      </p>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
        {boxes.map((box) => {
          const placed = isBoxPlaced(box.id);
          return (
            <div key={box.id} className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <BoxIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{box.name}</p>
                <p className="text-xs text-gray-500 truncate">{box.location}</p>
              </div>
              {placed ? (
                <Badge variant="secondary" className="text-xs shrink-0">
                  배치됨
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={() => onAddBox(box.id)}
                  aria-label={`${box.name} 맵에 배치`}
                  disabled={!isEditMode}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StageMap() {
  const { boxes, updateBox, getItemsForBox, loading: appLoading, isEditMode } = useApp();
  const layout = useStageLayout(isEditMode);
  const zoneTypes = layout.zoneTypes.length ? layout.zoneTypes : defaultZoneTypes;
  const [zones, setZones] = useState<Zone[]>([]);
  const [boxPositions, setBoxPositions] = useState<BoxPosition[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [newZoneSize, setNewZoneSize] = useState<ZoneSize>("m");

  const [editingZoneTypeId, setEditingZoneTypeId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");

  const [isAddZoneDialogOpen, setIsAddZoneDialogOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneColor, setNewZoneColor] = useState("purple");

  const [deleteConfirmZoneTypeId, setDeleteConfirmZoneTypeId] = useState<string | null>(null);

  const [isZonePanelOpen, setIsZonePanelOpen] = useState(false);
  const [isBoxPanelOpen, setIsBoxPanelOpen] = useState(false);

  useEffect(() => {
    setZones(layout.zones);
    setBoxPositions(layout.boxPositions);
  }, [layout.zones, layout.boxPositions]);

  useEffect(() => {
    if (!isEditMode) {
      setEditingZoneTypeId(null);
      setEditingZoneName("");
      setIsAddZoneDialogOpen(false);
      setDeleteConfirmZoneTypeId(null);
    }
  }, [isEditMode]);

  const setBoxPlacedOnMap = async (boxId: string, placed: boolean) => {
    if (!isEditMode) return;

    const box = boxes.find((b) => b.id === boxId);
    if (box) await updateBox({ ...box, placed });
  };

  const addZone = async (zoneTypeId: string) => {
    if (!isEditMode) return;

    const x = 100 + (zones.length * 30) % 500;
    const y = 100 + (zones.length * 30) % 400;
    await layout.addZone(zoneTypeId, newZoneSize, x, y);
  };

  const updateZoneSize = async (id: string, size: ZoneSize) => {
    if (!isEditMode) return;

    const { width, height } = getZoneDimensions(size);
    const zone = zones.find((z) => z.id === id);
    if (!zone) return;
    const canvas = getStageMapCanvas();
    let x = zone.x;
    let y = zone.y;
    if (canvas) {
      const { width: canvasW, height: canvasH } = getCanvasLogicalSize(canvas);
      x = Math.max(0, Math.min(canvasW - width, x));
      y = Math.max(0, Math.min(canvasH - height, y));
    }
    const updated = { ...zone, size, x, y };
    setZones((prev) => prev.map((z) => (z.id === id ? updated : z)));
    await layout.updateZone(updated);
  };

  const addCustomZoneType = async () => {
    if (!isEditMode) return;

    if (newZoneName.trim()) {
      const colorClass = colorOptions.find((c) => c.value === newZoneColor)?.class || colorOptions[0].class;
      const newZoneType: ZoneType = {
        id: `custom-${createId()}`,
        label: newZoneName,
        color: colorClass,
      };
      await layout.addZoneType(newZoneType);
      setNewZoneName("");
      setNewZoneColor("purple");
      setIsAddZoneDialogOpen(false);
    }
  };

  const startEditZoneType = (zoneType: ZoneType) => {
    if (!isEditMode) return;

    setEditingZoneTypeId(zoneType.id);
    setEditingZoneName(zoneType.label);
  };

  const saveZoneTypeName = async () => {
    if (!isEditMode) return;

    if (editingZoneTypeId && editingZoneName.trim()) {
      const zt = zoneTypes.find((z) => z.id === editingZoneTypeId);
      if (zt) await layout.updateZoneType({ ...zt, label: editingZoneName });
    }
    setEditingZoneTypeId(null);
    setEditingZoneName("");
  };

  const deleteZoneType = async (zoneTypeId: string) => {
    if (!isEditMode) return;

    await layout.deleteZoneType(zoneTypeId);
    setDeleteConfirmZoneTypeId(null);
  };

  const addBox = async (boxId: string) => {
    if (!isEditMode) return;

    const x = 150 + (boxPositions.length * 40) % 600;
    const y = 150 + (boxPositions.length * 40) % 500;
    await layout.addBoxPosition(boxId, x, y);
    await setBoxPlacedOnMap(boxId, true);
  };

  const moveZone = (id: string, x: number, y: number) => {
    if (!isEditMode) return;

    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, x, y } : z)));
  };

  const persistZoneMove = async (id: string, x: number, y: number) => {
    if (!isEditMode) return;

    const zone = zones.find((z) => z.id === id);
    if (zone) await layout.updateZone({ ...zone, x, y });
  };

  const moveBox = (id: string, x: number, y: number) => {
    if (!isEditMode) return;

    setBoxPositions((prev) => prev.map((bp) => (bp.id === id ? { ...bp, x, y } : bp)));
  };

  const persistBoxMove = async (id: string, x: number, y: number) => {
    if (!isEditMode) return;

    const bp = boxPositions.find((b) => b.id === id);
    if (bp) await layout.updateBoxPosition({ ...bp, x, y });
  };

  const deleteZone = async (id: string) => {
    if (!isEditMode) return;

    await layout.deleteZone(id);
  };

  const deleteBox = async (positionId: string) => {
    if (!isEditMode) return;

    const removed = boxPositions.find((bp) => bp.id === positionId);
    await layout.deleteBoxPosition(positionId);
    if (removed) {
      await setBoxPlacedOnMap(removed.boxId, false);
    }
  };

  const cancelEditZoneType = () => {
    setEditingZoneTypeId(null);
    setEditingZoneName("");
  };

  const zoneElementsListProps = {
    isEditMode,
    zoneTypes,
    zones,
    editingZoneTypeId,
    editingZoneName,
    newZoneSize,
    isAddZoneDialogOpen,
    newZoneName,
    newZoneColor,
    onNewZoneSizeChange: setNewZoneSize,
    onEditingZoneNameChange: setEditingZoneName,
    onStartEditZoneType: startEditZoneType,
    onSaveZoneTypeName: saveZoneTypeName,
    onCancelEditZoneType: cancelEditZoneType,
    onAddZone: addZone,
    onSetDeleteConfirmZoneTypeId: setDeleteConfirmZoneTypeId,
    onSetIsAddZoneDialogOpen: setIsAddZoneDialogOpen,
    onNewZoneNameChange: setNewZoneName,
    onNewZoneColorChange: setNewZoneColor,
    onAddCustomZoneType: addCustomZoneType,
  };

  const selectedBox = boxes.find(b => b.id === selectedBoxId);
  const selectedBoxItems = selectedBoxId ? getItemsForBox(selectedBoxId) : [];
  const preparedCount = selectedBoxItems.filter(item => item.prepared).length;

  const isBoxPlaced = (boxId: string) => {
    return boxPositions.some(bp => bp.boxId === boxId);
  };

  const zonesOnCanvas = zones.map(z => {
    const zoneType = zoneTypes.find(zt => zt.id === z.zoneTypeId);
    return { ...z, zoneType };
  }).filter(z => z.zoneType);

  if (appLoading || layout.loading) {
    return (
      <div className="page-container p-4 md:p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-container p-4 md:p-8 pb-20 md:pb-8 flex flex-col min-h-0">
      <div className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 break-keep">무대 맵</h1>
        <p className="text-sm md:text-base text-gray-600 break-keep">수련회 장소의 레이아웃을 구성하고 박스 배치를 계획하세요</p>
      </div>

      {/* Mobile Accordion Panels */}
      <div className="md:hidden space-y-2 mb-4 shrink-0">
        <Collapsible open={isZonePanelOpen} onOpenChange={setIsZonePanelOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between min-h-[44px]">
              <span className="break-keep">구역 요소</span>
              {isZonePanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="p-4">
                <ZoneElementsList {...zoneElementsListProps} />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={isBoxPanelOpen} onOpenChange={setIsBoxPanelOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between min-h-[44px]">
              <span className="break-keep">박스 배치</span>
              {isBoxPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="p-4">
                <BoxPlacementList
                  boxes={boxes}
                  isBoxPlaced={isBoxPlaced}
                  isEditMode={isEditMode}
                  onAddBox={addBox}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-80 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">구역 요소</CardTitle>
              <p className="text-sm text-gray-500 font-normal mt-1">
                크기를 고른 뒤 + 로 레이아웃에 추가
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <ZoneElementsList {...zoneElementsListProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">박스 배치</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <BoxPlacementList
                boxes={boxes}
                isBoxPlaced={isBoxPlaced}
                isEditMode={isEditMode}
                onAddBox={addBox}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-1 min-h-0 flex-col min-w-0">
          <StageMapViewportProvider>
            <Card className="flex flex-1 min-h-0 flex flex-col">
              <CardHeader className="shrink-0 pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base md:text-lg">무대 레이아웃</CardTitle>
                  <StageMapZoomButtons />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 min-h-0 flex flex-col pt-0 px-2 pb-2 md:px-4 md:pb-4">
                <StageMapCanvasScrollArea>
                  <div
                    id="stage-map-canvas"
                  className="relative min-h-[500px] md:min-h-[700px] min-w-[600px] bg-white border-2 border-gray-300 rounded-lg touch-none box-border shrink-0"
                  style={{
                    backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                >
                {zonesOnCanvas.map((zone) => {
                  const { width, height } = getZoneDimensions(zone.size);
                  return (
                    <DraggableZone
                      key={zone.id}
                      zone={zone}
                      zoneType={zone.zoneType!}
                      width={width}
                      height={height}
                      editable={isEditMode}
                      onMove={moveZone}
                      onMoveEnd={persistZoneMove}
                      onDelete={deleteZone}
                      onResize={updateZoneSize}
                    />
                  );
                })}
                {boxPositions.map((boxPos) => {
                  const box = boxes.find((b) => b.id === boxPos.boxId);
                  return (
                    <DraggableBox
                      key={boxPos.id}
                      boxPosition={boxPos}
                      box={box}
                      editable={isEditMode}
                      onMove={moveBox}
                      onMoveEnd={persistBoxMove}
                      onDelete={deleteBox}
                      onClick={() => setSelectedBoxId(boxPos.boxId)}
                    />
                  );
                })}
                {zones.length === 0 && boxPositions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 p-4">
                    <p className="text-xs md:text-base text-center break-keep">
                      {isEditMode ? (
                        <>
                          <span className="md:hidden">위에서 요소를 추가하여 무대 맵을 구성하세요</span>
                          <span className="hidden md:inline">왼쪽에서 요소를 추가하여 무대 맵을 구성하세요</span>
                        </>
                      ) : (
                        <span>무대 맵에 배치된 요소가 없습니다</span>
                      )}
                    </p>
                  </div>
                )}
                  </div>
                </StageMapCanvasScrollArea>
              </CardContent>
            </Card>
          </StageMapViewportProvider>
        </div>
      </div>

      {selectedBox && (
        <Dialog open={!!selectedBoxId} onOpenChange={() => setSelectedBoxId(null)}>
          <DialogContent className="max-w-[90vw] md:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="break-keep">{selectedBox.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedBoxId(null)}
                  className="min-h-[44px] min-w-[44px]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs md:text-sm text-gray-600">배치 위치</Label>
                <p className="text-sm md:text-base font-medium break-keep">{selectedBox.location}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs md:text-sm text-gray-600 break-keep">배정된 물품</Label>
                  <Badge variant={preparedCount === selectedBoxItems.length ? "default" : "secondary"} className="text-xs">
                    {preparedCount} / {selectedBoxItems.length} 완료
                  </Badge>
                </div>
                {selectedBoxItems.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedBoxItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.prepared ? (
                            <Check className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs md:text-sm font-medium break-keep ${item.prepared ? "line-through text-gray-500" : ""}`}>
                              {item.name}
                            </p>
                            {item.detailName && (
                              <p className="text-xs text-gray-500 break-keep mt-0.5">
                                {item.detailName}
                              </p>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              <span className="text-xs text-gray-500 break-keep">수량: {item.quantity}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-gray-400 text-center py-4 break-keep">배정된 물품이 없습니다</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleteConfirmZoneTypeId} onOpenChange={() => setDeleteConfirmZoneTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              구역 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              캔버스에 배치된 해당 구역도 함께 삭제됩니다. 삭제할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmZoneTypeId && deleteZoneType(deleteConfirmZoneTypeId)}
              disabled={!isEditMode}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
