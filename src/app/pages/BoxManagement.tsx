import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, Image as ImageIcon, MapPin, Package, X, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { useApp } from "../context/AppContext";

export default function BoxManagement() {
  const { boxes, loading, addBox, updateBox, deleteBox, getItemsForBox, assignItemToBox } = useApp();
  const [newBox, setNewBox] = useState({ name: "", location: "" });
  const [isOpen, setIsOpen] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editBox, setEditBox] = useState({ name: "", location: "" });

  const handleAddBox = async () => {
    const name = newBox.name.trim();
    const location = newBox.location.trim();
    if (!name || !location) return;

    const ok = await addBox({ name, location });
    if (ok) {
      setNewBox({ name: "", location: "" });
      setIsOpen(false);
    }
  };

  const togglePlaced = async (box: (typeof boxes)[0]) => {
    await updateBox({ ...box, placed: !box.placed });
  };

  const handleDeleteBox = async (id: string) => {
    await deleteBox(id);
    if (editingBoxId === id) setEditingBoxId(null);
  };

  const startEditBox = (box: { id: string; name: string; location: string }) => {
    setEditingBoxId(box.id);
    setEditBox({ name: box.name, location: box.location });
  };

  const saveEditBox = async () => {
    if (!editingBoxId || !editBox.name.trim() || !editBox.location.trim()) return;
    const box = boxes.find((b) => b.id === editingBoxId);
    if (box) {
      await updateBox({
        ...box,
        name: editBox.name.trim(),
        location: editBox.location.trim(),
      });
    }
    setEditingBoxId(null);
    setEditBox({ name: "", location: "" });
  };

  const cancelEditBox = () => {
    setEditingBoxId(null);
    setEditBox({ name: "", location: "" });
  };

  const handleImageUpload = (box: (typeof boxes)[0], event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateBox({
            ...box,
            imageUrls: [...box.imageUrls, reader.result as string],
          });
        };
        reader.readAsDataURL(file);
      });
    }
    event.target.value = "";
  };

  const deleteImage = async (box: (typeof boxes)[0], imageIndex: number) => {
    await updateBox({
      ...box,
      imageUrls: box.imageUrls.filter((_, idx) => idx !== imageIndex),
    });
  };

  const removeItemFromBox = async (itemId: string) => {
    await assignItemToBox(itemId, undefined);
  };

  const stats = {
    total: boxes.length,
    placed: boxes.filter((b) => b.placed).length,
    items: boxes.reduce((sum, box) => sum + getItemsForBox(box.id).length, 0),
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
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 break-keep">박스 관리</h1>
          <p className="text-sm md:text-base text-gray-600 break-keep">물품 박스를 정리하고 배치 위치를 체크하세요</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              박스 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] md:max-w-md">
            <DialogHeader>
              <DialogTitle>새 박스 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>박스명</Label>
                <Input
                  value={newBox.name}
                  onChange={(e) => setNewBox({ ...newBox, name: e.target.value })}
                  placeholder="예: 박스 A - 피아노팀"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label>배치 위치</Label>
                <Input
                  value={newBox.location}
                  onChange={(e) => setNewBox({ ...newBox, location: e.target.value })}
                  placeholder="예: 무대 왼쪽"
                  className="min-h-[44px]"
                />
              </div>
              <Button type="button" onClick={handleAddBox} className="w-full min-h-[44px]">
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">총 박스</p>
                <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">배치 완료</p>
                <p className="text-xl md:text-2xl font-bold">
                  {stats.placed} / {stats.total}
                </p>
              </div>
              <MapPin className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">배정된 물품</p>
                <p className="text-xl md:text-2xl font-bold">{stats.items}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {boxes.map((box) => {
          const assignedItems = getItemsForBox(box.id);
          return (
            <Card key={box.id}>
              <CardHeader className="p-4 md:p-6">
                {editingBoxId === box.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label>박스명</Label>
                      <Input
                        value={editBox.name}
                        onChange={(e) => setEditBox({ ...editBox, name: e.target.value })}
                        className="min-h-[44px] mt-1"
                      />
                    </div>
                    <div>
                      <Label>배치 위치</Label>
                      <Input
                        value={editBox.location}
                        onChange={(e) => setEditBox({ ...editBox, location: e.target.value })}
                        className="min-h-[44px] mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEditBox} className="flex-1 min-h-[44px]">
                        저장
                      </Button>
                      <Button variant="outline" onClick={cancelEditBox} className="flex-1 min-h-[44px]">
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg break-keep">{box.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-500 shrink-0" />
                        <span className="text-xs md:text-sm text-gray-600 break-keep">{box.location}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditBox(box)}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBox(box.id)}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                {box.imageUrls.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {box.imageUrls.map((imageUrl, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden">
                          <img src={imageUrl} alt={`${box.name} - ${idx + 1}`} className="w-full h-24 md:h-32 object-cover" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6"
                            onClick={() => deleteImage(box, idx)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-sm md:text-base font-medium mb-2 flex items-center justify-between">
                    <span className="break-keep">배정된 물품</span>
                    <Badge variant="secondary" className="text-xs">{assignedItems.length}개</Badge>
                  </h4>
                  {assignedItems.length > 0 ? (
                    <div className="space-y-2">
                      {assignedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs md:text-sm font-medium break-keep block truncate">{item.name}</span>
                            {item.detailName && (
                              <span className="text-xs text-gray-500 break-keep block truncate mt-0.5">
                                {item.detailName}
                              </span>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              <span className="text-xs text-gray-500 break-keep">수량: {item.quantity}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 md:h-6 md:w-6 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 shrink-0 ml-2"
                            onClick={() => removeItemFromBox(item.id)}
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm text-gray-400 text-center py-4 break-keep">배정된 물품이 없습니다</p>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    variant={box.placed ? "default" : "outline"}
                    size="sm"
                    className="flex-1 min-h-[44px]"
                    onClick={() => togglePlaced(box)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-xs md:text-sm break-keep">{box.placed ? "배치 완료" : "배치 체크"}</span>
                  </Button>
                  <Label htmlFor={`upload-${box.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full min-h-[44px]" asChild>
                      <span>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        <span className="text-xs md:text-sm break-keep">사진 추가 ({box.imageUrls.length})</span>
                      </span>
                    </Button>
                  </Label>
                  <input
                    id={`upload-${box.id}`}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(box, e)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
