import { Injectable } from '@nestjs/common';

@Injectable()
export class AtsService {
  /**
   * Calculate compatibility score between candidate skills and job requirements
   */
  calculateMatchScore(candidateSkills: string[], requiredSkills: string[]) {
    if (!requiredSkills || requiredSkills.length === 0) {
      return {
        score: 100,
        missingSkills: [],
        matchedSkills: candidateSkills,
      };
    }

    const cSkillsLower = candidateSkills.map(s => s.toLowerCase());
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of requiredSkills) {
      if (cSkillsLower.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    const score = Math.round((matchedSkills.length / requiredSkills.length) * 100);

    return {
      score,
      matchedSkills,
      missingSkills,
    };
  }
}
