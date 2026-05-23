import { useNavigate } from "react-router-dom";
import { useBodyClass } from "@/hooks/useBodyClass";
import { useAppStore } from "@/store/app-store";

export function useHomePageController() {
  const navigate = useNavigate();
  const authStatus = useAppStore((state) => state.authStatus);
  const isProjectPickerOpen = useAppStore((state) => state.isProjectPickerOpen);
  const setProjectPickerOpen = useAppStore((state) => state.setProjectPickerOpen);
  const setProjectBrowserPath = useAppStore((state) => state.setProjectBrowserPath);
  const setCandidateProjectPath = useAppStore((state) => state.setCandidateProjectPath);
  const setSelectedBrowserEntryPath = useAppStore((state) => state.setSelectedBrowserEntryPath);
  const setProjectPickerHistory = useAppStore((state) => state.setProjectPickerHistory);
  const setProjectPickerHistoryIndex = useAppStore((state) => state.setProjectPickerHistoryIndex);

  useBodyClass("home-page");

  const openProjectPicker = () => {
    setProjectBrowserPath("");
    setCandidateProjectPath("");
    setSelectedBrowserEntryPath("");
    setProjectPickerHistory([]);
    setProjectPickerHistoryIndex(-1);
    setProjectPickerOpen(true);
  };

  return {
    authValid: authStatus?.valid === true,
    closeProjectPicker: () => setProjectPickerOpen(false),
    isProjectPickerOpen,
    navigate,
    onProjectSelected: () => navigate("/start-mode"),
    openProjectPicker
  };
}
