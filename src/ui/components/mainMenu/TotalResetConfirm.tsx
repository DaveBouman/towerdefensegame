import { BackButton } from './menuShared';
import { t } from '../../../game/copy/strings';

interface TotalResetConfirmProps {
    step: 1 | 2;
    onBack: () => void;
    onContinue: () => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export const TotalResetConfirm = ({
    step,
    onBack,
    onContinue,
    onCancel,
    onConfirm,
}: TotalResetConfirmProps) =>
{
    if (step === 1)
    {
        return (
            <>
                <BackButton onClick={onBack} />
                <p className="main-menu__eyebrow">{t('settings.reset.eyebrow')}</p>
                <h2 className="main-menu__screen-title">{t('settings.reset.confirm1.title')}</h2>
                <p className="main-menu__confirm-copy">{t('settings.reset.confirm1.body')}</p>
                <ul className="main-menu__reset-list">
                    <li>{t('settings.reset.item.collection')}</li>
                    <li>{t('settings.reset.item.bestiary')}</li>
                    <li>{t('settings.reset.item.ascension')}</li>
                    <li>{t('settings.reset.item.tutorial')}</li>
                    <li>{t('settings.reset.item.settings')}</li>
                </ul>
                <div className="main-menu__actions">
                    <button
                        type="button"
                        className="main-menu__start main-menu__start--danger"
                        onClick={onContinue}
                    >
                        {t('settings.reset.confirm1.continue')}
                    </button>
                    <button
                        type="button"
                        className="main-menu__secondary"
                        onClick={onCancel}
                    >
                        {t('settings.reset.cancel')}
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <BackButton onClick={onBack} />
            <p className="main-menu__eyebrow">{t('settings.reset.eyebrow')}</p>
            <h2 className="main-menu__screen-title">{t('settings.reset.confirm2.title')}</h2>
            <p className="main-menu__confirm-copy main-menu__confirm-copy--danger">
                {t('settings.reset.confirm2.body')}
            </p>
            <div className="main-menu__actions">
                <button
                    type="button"
                    className="main-menu__start main-menu__start--danger"
                    onClick={onConfirm}
                >
                    {t('settings.reset.confirm2.action')}
                </button>
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={onCancel}
                >
                    {t('settings.reset.cancel')}
                </button>
            </div>
        </>
    );
};
