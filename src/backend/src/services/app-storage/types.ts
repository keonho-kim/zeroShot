export interface StoredArchitectSession {
  id: string;
  projectRoot: string;
  goal: string;
  title: string;
  summary: string;
  decisionsJson: string;
  createdAt: string;
}

export interface StoredDesignSession {
  id: string;
  projectRoot: string;
  mode: string;
  title: string;
  summary: string;
  responseJson: string;
  createdAt: string;
}
