import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Package, Check, Box, Map, Eye, Pencil } from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { cn } from "../components/ui/utils";

export default function Home() {
  const { items, boxes, appMode, setAppMode } = useApp();

  const preparedCount = items.filter((i) => i.prepared).length;
  const placedBoxes = boxes.filter((b) => b.placed).length;

  const quickStats = [
    { label: "총 물품", value: items.length.toString(), icon: Package, color: "bg-blue-500" },
    { label: "준비 완료", value: `${preparedCount} / ${items.length}`, icon: Check, color: "bg-green-500" },
    { label: "총 박스", value: boxes.length.toString(), icon: Box, color: "bg-purple-500" },
    { label: "배치 완료", value: `${placedBoxes} / ${boxes.length}`, icon: Map, color: "bg-orange-500" },
  ];

  const quickLinks = [
    { title: "물품 목록", description: "수련회 물품을 관리하세요", path: "/inventory", icon: Package },
    { title: "박스 관리", description: "물품 박스를 정리하세요", path: "/boxes", icon: Box },
    { title: "무대 맵", description: "무대 레이아웃을 구성하세요", path: "/stage-map", icon: Map },
  ];

  return (
    <div className="page-container p-4 md:p-8 pb-20 md:pb-8">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 break-keep">수련회 관리 대시보드</h1>
          <p className="text-sm md:text-base text-gray-600 break-keep">수련회 준비 현황을 한눈에 확인하세요</p>
        </div>
        <div className="inline-flex w-full md:w-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "flex-1 md:flex-none min-h-[40px] px-3 text-sm",
              appMode === "viewer" && "bg-gray-900 text-white hover:bg-gray-900 hover:text-white"
            )}
            aria-pressed={appMode === "viewer"}
            onClick={() => setAppMode("viewer")}
          >
            <Eye className="w-4 h-4" />
            뷰어 모드
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "flex-1 md:flex-none min-h-[40px] px-3 text-sm",
              appMode === "edit" && "bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
            )}
            aria-pressed={appMode === "edit"}
            onClick={() => setAppMode("edit")}
          >
            <Pencil className="w-4 h-4" />
            편집 모드
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm text-gray-600 mb-1 break-keep">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-2 md:p-3 rounded-lg`}>
                    <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 break-keep">빠른 접근</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer min-h-[44px]">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
                      </div>
                      <CardTitle className="text-base md:text-lg break-keep">{link.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                    <p className="text-xs md:text-sm text-gray-600 break-keep">{link.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
