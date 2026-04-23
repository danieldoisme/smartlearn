import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  BookOpen,
  FileText,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ExternalLink,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  QuestionType,
  QuestionTypeLabel,
  SessionType,
  DisplayMode,
} from "@/models";
import { usePreferences } from "@/api/me";
import { useCreateNote } from "@/api/bookmarks";
import {
  useAvailableStudyChapters,
  useStartStudySession,
  useSubmitStudyAnswer,
  useCompleteStudySession,
} from "@/api/study";
import { useDocumentDetail } from "@/api/document";
import { useRef } from "react";
import {
  Dialog as ShadDialog,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
} from "@/components/ui/dialog";

function toMultiWire(labels) {
  return [...labels].sort().join(",");
}

function toArrayAnswer(wireValue) {
  if (!wireValue) return [];
  return wireValue.split(",").map((s) => s.trim());
}

function getChapterStatus(chapter) {
  if (!chapter?.questionCount) return "empty";
  if (chapter.progress >= 100) return "completed";
  if (chapter.answeredCount > 0) return "in_progress";
  return "not_started";
}

function getChapterStatusMeta(chapter) {
  const status = getChapterStatus(chapter);
  if (status === "completed")
    return { label: "Đã hoàn thành", variant: "success" };
  if (status === "in_progress") return { label: "Đang học", variant: "info" };
  if (status === "empty")
    return { label: "Chưa có câu hỏi", variant: "warning" };
  return { label: "Chưa học", variant: "secondary" };
}

const statusFilters = [
  { value: "all", label: "Tất cả" },
  { value: "not_started", label: "Chưa học" },
  { value: "in_progress", label: "Đang học" },
  { value: "completed", label: "Đã hoàn thành" },
];

function snapshotKey(sessionType, chapterId) {
  return `smartlearn.study.${sessionType}.${chapterId}`;
}

function readSnapshot(sessionType, chapterId) {
  if (!chapterId) return null;
  try {
    const raw = localStorage.getItem(snapshotKey(sessionType, chapterId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(sessionType, chapterId, payload) {
  if (!chapterId) return;
  try {
    localStorage.setItem(
      snapshotKey(sessionType, chapterId),
      JSON.stringify(payload),
    );
  } catch {
    // storage quota / disabled — ignore
  }
}

function clearSnapshot(sessionType, chapterId) {
  if (!chapterId) return;
  try {
    localStorage.removeItem(snapshotKey(sessionType, chapterId));
  } catch {
    // ignore
  }
}

export default function StudyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chapterIdRaw = searchParams.get("chapterId");
  const chapterId = chapterIdRaw ? Number(chapterIdRaw) : null;
  const mode = searchParams.get("mode");
  const sessionType =
    mode === SessionType.REVIEW ? SessionType.REVIEW : SessionType.LEARN;
  const restartParam = searchParams.get("restart") === "true";
  const reviewQuestionIds = useMemo(() => {
    const raw = searchParams.get("questionIds");
    if (!raw) return [];
    return [
      ...new Set(
        raw
          .split(",")
          .map((value) => Number(value))
          .filter(Number.isInteger),
      ),
    ];
  }, [searchParams]);

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState({});
  const [fillAnswer, setFillAnswer] = useState("");
  const [results, setResults] = useState({}); // { [qid]: { isCorrect, correctAnswer, correctLabel, isLocked } }
  const [showSource, setShowSource] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const viewerScrollRef = useRef(null);

  const { data: availableChapters = [], isLoading: availableLoading } =
    useAvailableStudyChapters();
  const { data: prefs } = usePreferences();
  const createNote = useCreateNote();
  const startMut = useStartStudySession();
  const submitMut = useSubmitStudyAnswer(sessionId);
  const completeMut = useCompleteStudySession();

  const startStatus = startMut.status;

  useEffect(() => {
    if (chapterId == null) return;
    if (startStatus !== "idle") return;
    startMut.mutate(
      {
        chapterId,
        sessionType,
        restart: restartParam,
        questionIds:
          sessionType === SessionType.REVIEW ? reviewQuestionIds : undefined,
      },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
          setQuestions(data.questions || []);

          const initialResults = {};
          const initialSelected = {};
          data.questions?.forEach((q) => {
            if (q.userAnswer !== null) {
              initialResults[q.id] = {
                isCorrect: q.isCorrect,
                isLocked: true,
              };
              if (q.questionType === QuestionType.MULTI) {
                initialSelected[q.id] = toArrayAnswer(q.userAnswer);
              } else {
                initialSelected[q.id] = q.userAnswer;
              }
            }
          });

          const snap = readSnapshot(sessionType, chapterId);
          const finalSelected = { ...initialSelected, ...snap?.selected };
          const finalResults = { ...initialResults, ...snap?.results };

          let targetQ = 0;
          if (snap && snap.sessionId === data.sessionId) {
            targetQ = snap.currentQ || 0;
          } else {
            const firstUnanswered = (data.questions || []).findIndex(
              (q) => q.userAnswer === null,
            );
            if (firstUnanswered !== -1) targetQ = firstUnanswered;
          }

          setSessionId(data.sessionId);
          setQuestions(data.questions || []);
          setResults(finalResults);
          setSelected(finalSelected);
          setCurrentQ(targetQ);

          // Sync fillAnswer for the target question
          const q = data.questions?.[targetQ];
          if (q?.questionType === QuestionType.FILL) {
            setFillAnswer(finalSelected[q.id] || "");
          }
        },
      },
    );
  }, [
    chapterId,
    reviewQuestionIds,
    sessionType,
    startStatus,
    startMut,
    restartParam,
  ]);

  useEffect(() => {
    if (!sessionId || chapterId == null) return;
    writeSnapshot(sessionType, chapterId, {
      sessionId,
      currentQ,
      selected,
      fillAnswer,
      results,
    });
  }, [
    sessionId,
    chapterId,
    sessionType,
    currentQ,
    selected,
    fillAnswer,
    results,
  ]);

  const question = questions[currentQ];
  const result = question ? results[question.id] : null;
  const isImmediate = prefs?.answerDisplayMode !== DisplayMode.END; // Default to immediate
  const submitted = !!result?.isLocked;
  const showFeedback = (submitted && isImmediate) || isReviewing;
  const totalQ = questions.length;
  const answeredCount = Object.keys(results).length;
  const progressPct = totalQ ? (answeredCount / totalQ) * 100 : 0;

  useEffect(() => {
    if (
      totalQ > 0 &&
      answeredCount === totalQ &&
      !isImmediate &&
      questions.every((q) => results[q.id]?.isLocked)
    ) {
      setTimeout(() => {
        setIsReviewing(true);
      }, 1000);
    }
  }, [totalQ, answeredCount, isImmediate, questions, results]);
  const activeChapter = useMemo(
    () =>
      availableChapters.find((chapter) => chapter.chapterId === chapterId) ||
      null,
    [availableChapters, chapterId],
  );

  const { data: docDetail } = useDocumentDetail(question?.documentId);
  const viewerChapter = useMemo(() => {
    if (!docDetail || !question?.chapterId) return null;
    return docDetail.chapters.find((c) => c.id === question.chapterId);
  }, [docDetail, question]);
  useEffect(() => {
    if (viewerOpen && viewerScrollRef.current) {
      setTimeout(() => {
        const highlight =
          viewerScrollRef.current.querySelector(".source-highlight");
        if (highlight) {
          highlight.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [viewerOpen]);
  const filteredChapters = useMemo(() => {
    if (statusFilter === "all") return availableChapters;
    return availableChapters.filter(
      (chapter) => getChapterStatus(chapter) === statusFilter,
    );
  }, [availableChapters, statusFilter]);

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredChapters.length / ITEMS_PER_PAGE);
  const actualPage =
    page > 1 && page > totalPages ? Math.max(1, totalPages) : page;

  const paginatedChapters = useMemo(() => {
    return filteredChapters.slice(
      (actualPage - 1) * ITEMS_PER_PAGE,
      actualPage * ITEMS_PER_PAGE,
    );
  }, [filteredChapters, actualPage]);

  const correctLabelSet = useMemo(() => {
    if (!result?.correctLabel) return new Set();
    return new Set(result.correctLabel.split(",").map((s) => s.trim()));
  }, [result]);

  if (chapterId == null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {sessionType === SessionType.REVIEW
              ? "Chọn chương để ôn tập"
              : "Chọn chương để học"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {sessionType === SessionType.REVIEW
              ? "Phiên ôn tập cần đúng chương và danh sách câu sai tương ứng."
              : "Chọn một chương đã có câu hỏi để bắt đầu hoặc tiếp tục phiên học."}
          </p>
        </div>

        {availableLoading ? (
          <div className="py-16 text-center text-slate-500">
            Đang tải danh sách chương...
          </div>
        ) : sessionType === SessionType.REVIEW ? (
          <Card className="p-8">
            <CardContent className="text-center space-y-4">
              <Lightbulb className="h-10 w-10 text-amber-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-800 font-medium">
                  Hãy mở một nhóm câu sai từ trang ôn tập
                </p>
                <p className="text-sm text-slate-500">
                  Chọn tài liệu hoặc chương cần ôn tập để hệ thống tạo đúng
                  phiên học.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Link to="/review">
                  <Button>Bắt đầu từ trang ôn tập</Button>
                </Link>
                <Link to="/study">
                  <Button variant="outline">Chuyển sang học thường</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : availableChapters.length === 0 ? (
          <Card className="p-8">
            <CardContent className="text-center space-y-4">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-800 font-medium">
                  Chưa có chương nào sẵn sàng để học
                </p>
                <p className="text-sm text-slate-500">
                  Hãy tải tài liệu lên và tạo câu hỏi trước khi bắt đầu học tập.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Link to="/upload">
                  <Button>Tải tài liệu</Button>
                </Link>
                <Link to="/library">
                  <Button variant="outline">Về thư viện</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    statusFilter === filter.value
                      ? "bg-primary-50 text-primary-700 border border-primary-200"
                      : "text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {filteredChapters.length === 0 ? (
              <Card className="p-8">
                <CardContent className="text-center space-y-3">
                  <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-slate-800 font-medium">
                      Không có chương nào trong nhóm &ldquo;
                      {
                        statusFilters.find(
                          (filter) => filter.value === statusFilter,
                        )?.label
                      }
                      &rdquo;
                    </p>
                    <p className="text-sm text-slate-500">
                      Thử đổi bộ lọc để xem thêm chương khả dụng.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setPage(1);
                    }}
                  >
                    Xem tất cả chương
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {paginatedChapters.map((chapter) => {
                  const statusMeta = getChapterStatusMeta(chapter);
                  return (
                    <Card key={chapter.chapterId} className="p-4">
                      <CardContent className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                          <BookOpen className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {chapter.chapterTitle}
                            </p>
                            <Badge variant="secondary">
                              {chapter.documentTitle}
                            </Badge>
                            <Badge variant={statusMeta.variant}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{chapter.questionCount} câu hỏi</span>
                            <span>
                              {chapter.answeredCount}/{chapter.questionCount} đã
                              làm
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress
                              value={chapter.progress}
                              className="flex-1 h-1.5"
                            />
                            <span className="text-xs text-slate-500">
                              {chapter.progress}%
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() =>
                              navigate(`/study?chapterId=${chapter.chapterId}`)
                            }
                          >
                            {chapter.answeredCount > 0
                              ? "Tiếp tục học"
                              : "Bắt đầu học"}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          {chapter.answeredCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() =>
                                navigate(
                                  `/study?chapterId=${chapter.chapterId}&restart=true`,
                                )
                              }
                            >
                              Học lại từ đầu
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Trang {actualPage} / {totalPages} (
                      {(actualPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                      {Math.min(
                        actualPage * ITEMS_PER_PAGE,
                        filteredChapters.length,
                      )}{" "}
                      trong tổng số {filteredChapters.length} chương)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, actualPage - 1))}
                        disabled={actualPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage(Math.min(totalPages, actualPage + 1))
                        }
                        disabled={actualPage >= totalPages}
                      >
                        Sau
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  if (startMut.isPending || (!sessionId && !startMut.isError)) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-slate-500">
        Đang tải câu hỏi...
      </div>
    );
  }

  if (startMut.isError) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Không thể bắt đầu phiên học.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>
          Về thư viện
        </Button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Chương này chưa có câu hỏi.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>
          Về thư viện
        </Button>
      </div>
    );
  }

  const handleSelect = (label) => {
    if (submitted) return;
    if (question.questionType === QuestionType.MULTI) {
      setSelected((prev) => {
        const current = prev[question.id] || [];
        return {
          ...prev,
          [question.id]: current.includes(label)
            ? current.filter((l) => l !== label)
            : [...current, label],
        };
      });
    } else {
      setSelected((prev) => ({ ...prev, [question.id]: label }));
    }
  };

  const buildSelectedAnswer = () => {
    if (question.questionType === QuestionType.FILL)
      return fillAnswer.trim() || null;
    if (question.questionType === QuestionType.MULTI) {
      const labels = selected[question.id] || [];
      return labels.length ? toMultiWire(labels) : null;
    }
    return selected[question.id] || null;
  };

  const handleSubmit = async () => {
    const selectedAnswer = buildSelectedAnswer();
    if (!selectedAnswer) return;
    try {
      const res = await submitMut.mutateAsync({
        questionId: question.id,
        selectedAnswer,
        isSkipped: false,
      });
      setResults((prev) => ({
        ...prev,
        [question.id]: {
          ...res,
          isLocked: true,
        },
      }));
      if (!isImmediate) {
        goNext();
      }
    } catch {
      // Leave state unchanged; user can retry
    }
  };

  const userIsCorrect = () => {
    return result?.isCorrect === true;
  };

  const optionIsCorrect = (opt) => {
    if (!showFeedback) return null;
    return correctLabelSet.has(opt.label);
  };

  const resetForNext = () => {
    setShowSource(false);
    setNoteContent("");
    setNoteMessage("");
  };

  const syncStateFromQuestion = (q) => {
    resetForNext();
    if (q.questionType === QuestionType.FILL) {
      setFillAnswer(selected[q.id] || "");
    }
  };

  const goNext = async () => {
    if (currentQ < totalQ - 1) {
      const nextQ = currentQ + 1;
      setCurrentQ(nextQ);
      syncStateFromQuestion(questions[nextQ]);
    } else {
      if (sessionId) {
        try {
          await completeMut.mutateAsync(sessionId);
        } catch {
          // ignore
        }
      }
      if (isImmediate) {
        clearSnapshot(sessionType, chapterId);
        navigate(sessionType === SessionType.REVIEW ? "/review" : "/progress");
      } else {
        setIsReviewing(true);
        setCurrentQ(0);
      }
    }
  };

  const goPrev = () => {
    if (currentQ > 0) {
      const prevQ = currentQ - 1;
      setCurrentQ(prevQ);
      syncStateFromQuestion(questions[prevQ]);
    }
  };

  const saveNote = async () => {
    if (!question || !noteContent.trim()) return;
    try {
      await createNote.mutateAsync({
        questionId: question.id,
        content: noteContent.trim(),
      });
      setNoteContent("");
      setNoteMessage("Đã lưu ghi chú.");
    } catch {
      setNoteMessage("Không thể lưu ghi chú.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {isReviewing ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <Card className="p-8 text-center bg-linear-to-br from-primary-50 to-white border-primary-100">
            <CardContent className="space-y-4">
              <div className="h-16 w-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Hoàn thành ôn tập!
              </h2>
              <p className="text-slate-500 max-w-xs mx-auto">
                Bạn đã hoàn thành tất cả {totalQ} câu hỏi trong chương này.
              </p>
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    ĐÚNG
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {Object.values(results).filter((r) => r.isCorrect).length}
                  </p>
                </div>
                <div className="text-center border-x border-slate-100 px-8">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    SAI
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      Object.values(results).filter(
                        (r) => !r.isCorrect && !r.isSkipped,
                      ).length
                    }
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    BỎ QUA
                  </p>
                  <p className="text-2xl font-bold text-slate-400">
                    {Object.values(results).filter((r) => r.isSkipped).length}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Chi tiết từng câu hỏi:
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {questions.map((q, i) => {
                    const r = results[q.id];
                    const statusClass = r?.isCorrect
                      ? "bg-emerald-500 text-white"
                      : r?.isSkipped
                        ? "bg-slate-200 text-slate-500"
                        : "bg-red-500 text-white";
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQ(i);
                          syncStateFromQuestion(questions[i]);
                          setIsReviewing(false); // Go back to question card to see details
                        }}
                        className={`h-10 w-full rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 ${statusClass}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                className="w-full mt-6"
                onClick={() => {
                  clearSnapshot(sessionType, chapterId);
                  navigate(
                    sessionType === SessionType.REVIEW
                      ? "/review"
                      : "/progress",
                  );
                }}
              >
                Hoàn thành
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/library")}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">
                  <span className="truncate max-w-[120px]">
                    {activeChapter?.documentTitle}
                  </span>
                  <span>/</span>
                  <span className="text-primary-600 truncate max-w-[150px]">
                    {activeChapter?.chapterTitle}
                  </span>
                </div>
                <h1 className="text-base font-bold text-slate-900 truncate">
                  Câu {currentQ + 1}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  question.questionType === QuestionType.MCQ
                    ? "default"
                    : question.questionType === QuestionType.MULTI
                      ? "info"
                      : "warning"
                }
                className="text-[10px]"
              >
                {QuestionTypeLabel[question.questionType]}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-0.5">
              <span>TIẾN ĐỘ HỌC TẬP</span>
              <span>
                {answeredCount} / {totalQ} CÂU
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          <Card className="p-6">
            <CardContent className="space-y-5">
              <p className="text-base text-slate-800 font-medium leading-relaxed vn-text">
                {question.content}
              </p>

              {(question.questionType === QuestionType.MCQ ||
                question.questionType === QuestionType.MULTI) && (
                <div className="space-y-2">
                  {question.options.map((opt) => {
                    const isSelected =
                      question.questionType === QuestionType.MULTI
                        ? (selected[question.id] || []).includes(opt.label)
                        : selected[question.id] === opt.label;
                    const correct = optionIsCorrect(opt);

                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleSelect(opt.label)}
                        disabled={submitted}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm transition-all cursor-pointer ${
                          showFeedback
                            ? correct
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                              : isSelected
                                ? "bg-red-50 border border-red-200 text-red-800"
                                : "bg-slate-50 border border-slate-100 text-slate-500"
                            : isSelected
                              ? "bg-primary-50 border border-primary-200 text-primary-800"
                              : "bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all ${
                            question.questionType === QuestionType.MULTI
                              ? "rounded-md"
                              : "rounded-full"
                          } ${
                            showFeedback
                              ? correct
                                ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                                : isSelected
                                  ? "border-red-500 bg-red-100 text-red-700"
                                  : "border-slate-300 bg-white text-transparent"
                              : isSelected
                                ? "border-primary-500 bg-primary-100 text-primary-700"
                                : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <span
                            className={`block ${question.questionType === QuestionType.MULTI ? "text-xs font-bold" : "h-2.5 w-2.5 rounded-full bg-current"} ${isSelected || (showFeedback && correct) ? "" : "opacity-0"}`}
                          >
                            {question.questionType === QuestionType.MULTI
                              ? "✓"
                              : ""}
                          </span>
                        </span>
                        <span className="flex-1 vn-text">{opt.content}</span>
                        {showFeedback && correct && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                        {showFeedback && isSelected && !correct && (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {question.questionType === QuestionType.FILL && (
                <div className="space-y-2">
                  <input
                    id="answer-input"
                    name="answer-input"
                    type="text"
                    value={fillAnswer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFillAnswer(val);
                      setSelected((prev) => ({ ...prev, [question.id]: val }));
                    }}
                    disabled={submitted}
                    placeholder="Nhập đáp án..."
                    className="glass-input w-full h-11 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                  {showFeedback && (
                    <p
                      className={`text-sm ${userIsCorrect() ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {userIsCorrect()
                        ? "✓ Chính xác!"
                        : `✗ Đáp án đúng: ${result?.correctAnswer || ""}`}
                    </p>
                  )}
                </div>
              )}

              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl ${userIsCorrect() ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {userIsCorrect() ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${userIsCorrect() ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {userIsCorrect()
                        ? "Tuyệt vời! Bạn đã trả lời đúng."
                        : `Chưa chính xác. ${result?.correctAnswer ? `Đáp án là: ${result.correctAnswer}` : ""}`}
                    </span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {showFeedback &&
            (question.sourcePage ||
              question.sourceContext ||
              question.sourceText) && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <button
                    onClick={() => setShowSource(!showSource)}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mb-2 cursor-pointer"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {showSource ? "Ẩn trích dẫn" : "Xem trích dẫn"}
                  </button>
                  {showSource && (
                    <Card className="p-4">
                      <CardContent>
                        {question.sourcePage && (
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-500">
                              Trang {question.sourcePage}
                            </span>
                          </div>
                        )}
                        {question.sourceContext ? (
                          <p className="text-sm text-slate-600 leading-relaxed vn-text">
                            {question.sourceContext}
                          </p>
                        ) : question.sourceText ? (
                          <p className="text-sm text-slate-600 leading-relaxed vn-text">
                            {question.sourceText}
                          </p>
                        ) : null}
                        {(question.documentTitle || question.chapterTitle) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {question.documentTitle && (
                              <Badge variant="secondary">
                                {question.documentTitle}
                              </Badge>
                            )}
                            {question.chapterTitle && (
                              <span>Chương: {question.chapterTitle}</span>
                            )}
                          </div>
                        )}
                        {viewerChapter && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => setViewerOpen(true)}
                          >
                            <FileText className="h-4 w-4" />
                            Mở trong tài liệu
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                        <div className="mt-3 space-y-2">
                          <Input
                            id="note-input"
                            name="note-input"
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Ghi chú nhanh cho câu hỏi này..."
                          />
                          <div className="flex items-center justify-between gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={saveNote}
                              disabled={
                                !noteContent.trim() || createNote.isPending
                              }
                            >
                              {createNote.isPending
                                ? "Đang lưu..."
                                : "Lưu ghi chú"}
                            </Button>
                            {noteMessage && (
                              <span className="text-xs text-slate-500">
                                {noteMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {isReviewing ? (
                <Button variant="ghost" onClick={() => setIsReviewing(false)}>
                  <ChevronLeft className="h-4 w-4" />
                  Quay lại
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={goPrev}
                  disabled={currentQ === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Câu trước
                </Button>
              )}
              {isReviewing === false &&
                questions.every((q) => results[q.id]?.isLocked) && (
                  <Button
                    variant="outline"
                    onClick={() => setIsReviewing(true)}
                  >
                    Quay lại trang kết quả
                  </Button>
                )}
            </div>
            <div className="flex gap-2">
              {!submitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitMut.isPending ||
                    (!selected[question.id] && !fillAnswer)
                  }
                >
                  {submitMut.isPending ? "Đang gửi..." : "Xác nhận"}
                </Button>
              ) : (
                <Button onClick={goNext} disabled={completeMut.isPending}>
                  {currentQ < totalQ - 1 ? "Câu tiếp theo" : "Xong"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <ShadDialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <ShadDialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <ShadDialogHeader>
            <ShadDialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-500" />
                <span>{question?.documentTitle || "Tài liệu"}</span>
              </div>
              {question?.sourcePage && (
                <Badge variant="secondary" className="mr-6">
                  Trang {question.sourcePage}
                </Badge>
              )}
            </ShadDialogTitle>
          </ShadDialogHeader>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            ref={viewerScrollRef}
          >
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {question?.chapterTitle || viewerChapter?.title}
              </h3>

              <div className="vn-text whitespace-pre-wrap text-slate-700 leading-relaxed text-base">
                {(() => {
                  const text = viewerChapter?.contentText || "";
                  const highlight = question?.sourceText || "";
                  if (!highlight || !text.includes(highlight)) {
                    return text;
                  }
                  const parts = text.split(highlight);
                  return (
                    <>
                      {parts.map((part, i) => (
                        <span key={i}>
                          {part}
                          {i < parts.length - 1 && (
                            <span className="source-highlight bg-yellow-200 font-semibold px-1 rounded border-b-2 border-yellow-400">
                              {highlight}
                            </span>
                          )}
                        </span>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </ShadDialogContent>
      </ShadDialog>
    </motion.div>
  );
}
