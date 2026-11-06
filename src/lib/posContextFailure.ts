import axios from 'axios'

export class PosContextUnavailableError extends Error {}

export function posContextFailure(error: unknown) {
  if (error instanceof PosContextUnavailableError) {
    return { unavailable: true, message: error.message }
  }
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status === 403 || status === 404) {
    return { unavailable: true, message: 'الفرع أو المخزن المحفوظ غير متاح لك حاليًا. يمكنك اختيار الفرع والمخزن الحاليين وإعادة اختيار المصدر.' }
  }
  if (status === 401) {
    return { unavailable: false, message: 'انتهت الجلسة. سجّل الدخول مجددًا ثم أعد المحاولة. بيانات التعاقد محفوظة.' }
  }
  return { unavailable: false, message: 'تعذر الاتصال بالخادم للتحقق من الفرع والمخزن المحفوظين. أعد المحاولة بعد عودة الخدمة. بيانات التعاقد محفوظة دون تغيير.' }
}
