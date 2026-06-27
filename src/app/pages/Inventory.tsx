import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, Check, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useApp } from "../context/AppContext";
import { DEFAULT_ITEM_CATEGORY, ITEM_CATEGORIES } from "../lib/itemCategories";
import { useEffect, useState } from "react";

export default function Inventory() {
  const { items, boxes, loading, error, isEditMode, addItem, updateItem, deleteItem, assignItemToBox } = useApp();
  const [newItem, setNewItem] = useState({
    name: "",
    detailName: "",
    category: DEFAULT_ITEM_CATEGORY,
    quantity: 1,
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isEditMode) setIsOpen(false);
  }, [isEditMode]);

  const handleAddItem = async () => {
    if (!isEditMode) return;

    if (newItem.name.trim()) {
      const ok = await addItem({
        ...newItem,
        name: newItem.name.trim(),
        detailName: newItem.detailName.trim(),
        prepared: false,
      });
      if (ok) {
        setNewItem({ name: "", detailName: "", category: DEFAULT_ITEM_CATEGORY, quantity: 1 });
        setIsOpen(false);
      }
    }
  };

  const togglePrepared = async (id: string) => {
    if (!isEditMode) return;

    const item = items.find((i) => i.id === id);
    if (item) await updateItem({ ...item, prepared: !item.prepared });
  };

  const handleDeleteItem = async (id: string) => {
    if (!isEditMode) return;

    await deleteItem(id);
  };

  const handleBoxAssignment = async (itemId: string, boxId: string) => {
    if (!isEditMode) return;

    await assignItemToBox(itemId, boxId === "unassigned" ? undefined : boxId);
  };

  const stats = {
    total: items.length,
    prepared: items.filter((i) => i.prepared).length,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    assigned: items.filter((i) => i.assignedBoxId).length,
  };

  if (loading) {
    return (
      <div className="page-container p-4 md:p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-container p-4 md:p-8 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 break-keep">물품 목록</h1>
          <p className="text-sm md:text-base text-gray-600 break-keep">수련회에 필요한 물품을 관리하세요</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(isEditMode && open)}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] w-full md:w-auto" disabled={!isEditMode}>
              <Plus className="w-4 h-4 mr-2" />
              물품 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] md:max-w-md">
            <DialogHeader>
              <DialogTitle>새 물품 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>물품명</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="예: 마이크"
                />
              </div>
              <div>
                <Label>세부 물품 명</Label>
                <Input
                  value={newItem.detailName}
                  onChange={(e) => setNewItem({ ...newItem, detailName: e.target.value })}
                  placeholder="예: 무선 핸드마이크"
                />
              </div>
              <div>
                <Label>카테고리</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>수량</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setNewItem({ ...newItem, quantity: Number.isNaN(parsed) ? 1 : Math.max(1, parsed) });
                  }}
                />
              </div>
              <Button type="button" onClick={handleAddItem} className="w-full">추가</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-keep">
          데이터 저장소 오류: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">총 물품 종류</p>
                <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">준비 완료</p>
                <p className="text-xl md:text-2xl font-bold">{stats.prepared} / {stats.total}</p>
              </div>
              <Check className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">총 수량</p>
                <p className="text-xl md:text-2xl font-bold">{stats.totalQuantity}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">박스 배정</p>
                <p className="text-xl md:text-2xl font-bold">{stats.assigned} / {stats.total}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전체 물품</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 md:space-y-3">
            {items.map((item) => {
              const assignedBox = boxes.find((b) => b.id === item.assignedBoxId);
              return (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 md:justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 md:gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={item.prepared}
                      onChange={() => togglePrepared(item.id)}
                      disabled={!isEditMode}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm md:text-base font-medium break-keep ${item.prepared ? "line-through text-gray-500" : "text-gray-900"}`}>
                        {item.name}
                      </h3>
                      {item.detailName && (
                        <p className="text-xs md:text-sm text-gray-500 break-keep mt-0.5">
                          {item.detailName}
                        </p>
                      )}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        <span className="text-xs md:text-sm text-gray-500 break-keep">수량: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 md:w-64">
                      <Select
                        value={item.assignedBoxId || "unassigned"}
                        onValueChange={(value) => handleBoxAssignment(item.id, value)}
                        disabled={!isEditMode}
                      >
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue>
                            <span className="text-sm break-keep">{assignedBox ? assignedBox.name : "미배정"}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">미배정</SelectItem>
                          {boxes.map((box) => (
                            <SelectItem key={box.id} value={box.id}>{box.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="min-h-[44px] min-w-[44px]"
                      disabled={!isEditMode}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
