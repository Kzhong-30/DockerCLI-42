export const APPOINTMENT_CONFIG = {
  MAX_NO_SHOW_COUNT: 3,
  BLACKLIST_DAYS: 30,
  MAX_DAYS_AHEAD: 7,
  MIN_CANCEL_HOURS: 2,
  MAX_APPOINTMENTS_PER_DAY: 2,
};

export const APPOINTMENT_TYPE_PRICE: Record<string, number> = {
  normal: 20,
  expert: 50,
  special: 100,
};

export const TIME_SLOT_LABEL: Record<string, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '夜间',
};

export const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  normal: '普通号',
  expert: '专家号',
  special: '特需号',
};

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
  no_show: '爽约',
};
