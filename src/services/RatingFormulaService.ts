import { IFormulaParams } from '../models/entities/IFormulaParams';

export default ({ mode = 'learn', level = 'easy', type = 'mcq', attempt = 0, correct = true, usedHint = false, time = 0 }: IFormulaParams) => {
  const key = [
    Modes[mode],
    levels(level, mode),
    types[type],
  ];
  switch (mode.toLowerCase()) {
    case 'practice':
      key[3] = attempt.toString();
      key[4] = hints(usedHint);
      break;
    case 'learn':
      key[3] = hints(usedHint);
      break;
    case 'mpq':
      key[3] = times(time);
      break;
  }
  key[key.length] = answer(correct);
  const keyString = key.join('.');
  return (correct ? 1 : -1) * (SCORES[keyString] || 0);
};

const levels = (level: string, mode: string) => {
  if (mode.toLowerCase() === 'learn') {
    switch (level.toLowerCase()) {
      case 'prerequisite_skill': return 'PS';
      case 'current_skill': return 'CS';
      default: return 'CS';
    }
  } else {
    switch (level.toLowerCase()) {
      case 'easy': case '1': return 'E';
      case 'medium': case '2': return 'M';
      case 'hard': case '3': return 'H';
      default: return 'E';
    }
  }
};

enum types {
  'fb-exm' = 'FB',
  'mcq' = 'MCQ'
}

enum Modes {
  'practice' = 'P',
  'learn' = 'L',
  'mpq' = 'MPQ',
}

const times = (time: number) => {
  if (time > 10) return 'G10';
  else return 'L10';
};

const hints = (usedHint: boolean) => {
  if (usedHint) return 'UH';
  return 'NH';
};

const answer = (correct: boolean) => {
  if (correct) return 'T';
  return 'F';
};

const SCORES = {
  'L.PS.FB.NH.T': 0.2,
  'L.PS.FB.UH.T': 0.18,
  'L.PS.FB.NH.F': 0.02,
  'L.PS.FB.UH.F': 0.04,
  'L.PS.MCQ.NH.T': 0.18,
  'L.PS.MCQ.UH.T': 0.16,
  'L.PS.MCQ.NH.F': 0.02,
  'L.PS.MCQ.UH.F': 0.04,
  'L.CS.FB.NH.T': 0.2,
  'L.CS.FB.UH.T': 0.18,
  'L.CS.FB.NH.F': 0.02,
  'L.CS.FB.UH.F': 0.04,
  'L.CS.MCQ.NH.T': 0.18,
  'L.CS.MCQ.UH.T': 0.16,
  'L.CS.MCQ.NH.F': 0.02,
  'L.CS.MCQ.UH.F': 0.04,
  'P.E.FB.1.NH.T': 0.1,
  'P.E.FB.1.UH.T': 0.09,
  'P.E.FB.1.NH.F': 0.01,
  'P.E.FB.1.UH.F': 0.02,
  'P.E.FB.2.NH.T': 0.09,
  'P.E.FB.2.UH.T': 0.08,
  'P.E.FB.2.NH.F': 0.01,
  'P.E.FB.2.UH.F': 0.02,
  'P.E.MCQ.1.NH.T': 0.09,
  'P.E.MCQ.1.UH.T': 0.08,
  'P.E.MCQ.1.NH.F': 0.01,
  'P.E.MCQ.1.UH.F': 0.02,
  'P.E.MCQ.2.NH.T': 0.08,
  'P.E.MCQ.2.UH.T': 0.07,
  'P.E.MCQ.2.NH.F': 0.02,
  'P.E.MCQ.2.UH.F': 0.03,
  'P.M.FB.1.NH.T': 0.15,
  'P.M.FB.1.UH.T': 0.135,
  'P.M.FB.1.NH.F': 0.015,
  'P.M.FB.1.UH.F': 0.03,
  'P.M.FB.2.NH.T': 0.135,
  'P.M.FB.2.UH.T': 0.12,
  'P.M.FB.2.NH.F': 0.03,
  'P.M.FB.2.UH.F': 0.045,
  'P.M.MCQ.1.NH.T': 0.135,
  'P.M.MCQ.1.UH.T': 0.12,
  'P.M.MCQ.1.NH.F': 0.015,
  'P.M.MCQ.1.UH.F': 0.03,
  'P.M.MCQ.2.NH.T': 0.12,
  'P.M.MCQ.2.UH.T': 0.105,
  'P.M.MCQ.2.NH.F': 0.03,
  'P.M.MCQ.2.UH.F': 0.045,
  'P.H.FB.1.NH.T': 0.2,
  'P.H.FB.1.UH.T': 0.18,
  'P.H.FB.1.NH.F': 0.02,
  'P.H.FB.1.UH.F': 0.04,
  'P.H.FB.2.NH.T': 0.18,
  'P.H.FB.2.UH.T': 0.16,
  'P.H.FB.2.NH.F': 0.04,
  'P.H.FB.2.UH.F': 0.06,
  'P.H.MCQ.1.NH.T': 0.18,
  'P.H.MCQ.1.UH.T': 0.16,
  'P.H.MCQ.1.NH.F': 0.02,
  'P.H.MCQ.1.UH.F': 0.04,
  'P.H.MCQ.2.NH.T': 0.16,
  'P.H.MCQ.2.UH.T': 0.14,
  'P.H.MCQ.2.NH.F': 0.04,
  'P.H.MCQ.2.UH.F': 0.06,
  'MPQ.E.MCQ.L10.T': 0.2,
  'MPQ.E.MCQ.G10.T': 0.14,
  'MPQ.E.MCQ.L10.F': 0.02,
  'MPQ.E.MCQ.G10.F': 0.08,
  'MPQ.M.MCQ.L10.T': 0.2,
  'MPQ.M.MCQ.G10.T': 0.14,
  'MPQ.M.MCQ.L10.F': 0.02,
  'MPQ.M.MCQ.G10.F': 0.08,
  'MPQ.H.MCQ.L10.T': 0.2,
  'MPQ.H.MCQ.G10.T': 0.14,
  'MPQ.H.MCQ.L10.F': 0.02,
  'MPQ.H.MCQ.G10.F': 0.088
};