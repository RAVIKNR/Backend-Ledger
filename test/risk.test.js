const { classify } = require('../src/services/risk.service');

describe('risk engine', () => {
    it('classifies explainable scores', () => {
        expect(classify(10)).toEqual({ level: 'LOW', decision: 'APPROVED' });
        expect(classify(35)).toEqual({ level: 'MEDIUM', decision: 'APPROVED' });
        expect(classify(60)).toEqual({ level: 'HIGH', decision: 'REVIEW' });
    });
});
