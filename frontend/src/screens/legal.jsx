import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Layout } from '../components/layout';

// Renseignées au build (voir .env.production.example) : l'identité de l'éditeur ne se devine pas.
const OPERATOR = import.meta.env.VITE_LEGAL_OPERATOR;
const CONTACT = import.meta.env.VITE_LEGAL_CONTACT;
const HOST = import.meta.env.VITE_LEGAL_HOST;
const INCOMPLETE = !OPERATOR || !CONTACT || !HOST;

const operator = OPERATOR || '[éditeur à compléter]';
const contact = CONTACT || '[adresse de contact à compléter]';
const host = HOST || '[hébergeur à compléter]';

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-headline font-black text-xl text-on-surface tracking-tight">{title}</h2>
      <div className="text-sm text-on-surface-variant leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function LegalPage({ title, children }) {
  const navigate = useNavigate();
  // Sans session, Layout n'affiche ni titre ni bouton retour.
  const { user } = useApp();
  return (
    <Layout title={title} showBack onBack={() => navigate(-1)}>
      <article className="max-w-2xl mx-auto py-4 space-y-6">
        {!user && (
          <>
            <Link to="/welcome" className="text-sm font-bold text-primary underline">Retour à l'accueil</Link>
            <h1 className="text-3xl font-headline font-black text-on-surface tracking-tight">{title}</h1>
          </>
        )}
        {INCOMPLETE && (
          <p role="note" className="rounded-2xl bg-error-container text-on-error-container text-sm font-bold p-4">
            Document provisoire : les informations de l'éditeur restent à compléter avant l'ouverture au public.
          </p>
        )}
        {children}
      </article>
    </Layout>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Confidentialité">
      <Section title="Responsable du traitement">
        <p>{operator}. Contact : {contact}. Hébergement : {host}.</p>
      </Section>
      <Section title="Données traitées">
        <p>Parents : nom, adresse email, mot de passe chiffré, dates d'acceptation des conditions et du consentement parental.</p>
        <p>Enfants : prénom, âge, mot de passe chiffré, avatar et couleur, solde et transactions, corvées avec notes et photos de preuve, objectifs d'épargne, demandes de dépense.</p>
        <p>Aucune publicité, aucun profilage, aucune revente de données.</p>
      </Section>
      <Section title="Finalité et base légale">
        <p>Ces données servent uniquement à faire fonctionner le suivi de l'argent de poche de la famille (exécution du service). Les données des enfants sont traitées avec le consentement d'un titulaire de l'autorité parentale, recueilli à l'inscription du parent.</p>
      </Section>
      <Section title="Mineurs">
        <p>Un enfant ne peut créer un compte qu'avec le code d'une famille dont un parent a donné son consentement. Le parent voit les données de ses enfants et peut supprimer leur compte à tout moment.</p>
      </Section>
      <Section title="Destinataires">
        <p>Les données restent visibles des seuls membres de la famille. Sous-traitants : {host} (hébergement), Resend (envoi de l'email de réinitialisation du parent) et, s'il est activé, Sentry (suivi des erreurs techniques, sans données de compte).</p>
      </Section>
      <Section title="Durée de conservation">
        <p>Les données sont conservées tant que le compte existe et supprimées lors de sa suppression. Les sauvegardes techniques sont effacées après leur durée de rétention.</p>
      </Section>
      <Section title="Cookies">
        <p>Un seul cookie, strictement nécessaire, maintient la session. Il n'y a pas de cookie de mesure d'audience ou de publicité.</p>
      </Section>
      <Section title="Vos droits">
        <p>Accès, rectification, effacement, limitation, opposition et portabilité. Depuis Paramètres, un parent peut exporter toutes les données de la famille et supprimer son compte, ceux de ses enfants ou la famille entière. Pour toute demande : {contact}. Vous pouvez saisir la CNIL (cnil.fr).</p>
      </Section>
    </LegalPage>
  );
}

export function TermsOfUse() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <Section title="Objet">
        <p>PocketMoney, édité par {operator}, aide les familles à suivre l'argent de poche, les corvées et l'épargne des enfants.</p>
      </Section>
      <Section title="Pas de service financier">
        <p>Les soldes affichés sont de simples compteurs tenus par la famille. PocketMoney ne détient, ne transfère et n'émet aucune somme d'argent.</p>
      </Section>
      <Section title="Comptes">
        <p>Un adulte titulaire de l'autorité parentale crée la famille et reste responsable de son usage et des comptes de ses enfants. Le code famille ne doit être communiqué qu'aux membres de la famille. Chacun protège son mot de passe.</p>
      </Section>
      <Section title="Usage acceptable">
        <p>Il est interdit de publier des contenus illicites ou portant atteinte à un enfant, ou de tenter d'accéder aux données d'une autre famille.</p>
      </Section>
      <Section title="Disponibilité et responsabilité">
        <p>Le service est fourni sans garantie de disponibilité continue. L'éditeur ne répond pas des décisions prises au sein de la famille sur la base des montants affichés.</p>
      </Section>
      <Section title="Résiliation">
        <p>Vous pouvez supprimer votre compte à tout moment depuis Paramètres. Voir aussi la <Link className="text-primary font-bold underline" to="/privacy">politique de confidentialité</Link>.</p>
      </Section>
      <Section title="Droit applicable et contact">
        <p>Droit français. Contact : {contact}.</p>
      </Section>
    </LegalPage>
  );
}
